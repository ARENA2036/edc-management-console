import os
import re
import urllib.parse
import yaml
import logging

logger = logging.getLogger(__name__)

# A path segment is a key, optionally followed by a list index, e.g. "ingresses[0]".
_PATH_SEGMENT = re.compile(r"^([^.\[\]]+)(?:\[(\d+)\])?$")


class _SafeDict(dict):
    """`str.format_map` helper that leaves unknown ``{placeholders}`` untouched
    instead of raising ``KeyError``."""
    def __missing__(self, key):
        return "{" + key + "}"


def as_context(source) -> dict:
    """Return a templating/derivation context dict from any source: a dict is
    returned as-is; a pydantic model is dumped (including ``extra`` fields); any
    other object falls back to its attribute dict."""
    if isinstance(source, dict):
        return source
    model_dump = getattr(source, "model_dump", None)
    if callable(model_dump):
        try:
            return model_dump()
        except Exception:
            pass
    return vars(source) if hasattr(source, "__dict__") else {}


def render_template(template, context) -> str:
    """Render a ``{placeholder}`` template against a context (a dict, a pydantic
    model, or any object). Unknown placeholders are left intact rather than
    raising."""
    return str(template).format_map(_SafeDict(as_context(context)))


def render_structure(value, context):
    """Recursively render ``{placeholder}`` templates inside a string, list or
    dict (non-string leaves are returned unchanged). Used so a `derive` value can
    be a structured literal (e.g. a list of annotation maps) and still have its
    templated leaves resolved."""
    if isinstance(value, str):
        return render_template(value, context)
    if isinstance(value, list):
        return [render_structure(item, context) for item in value]
    if isinstance(value, dict):
        return {key: render_structure(item, context) for key, item in value.items()}
    return value


def resolve_version_entry(version: str, versions_config: list):
    """Return the deployable version entry ({version, valuesYaml, ...}) whose
    `version` matches exactly, or None if unsupported."""
    for entry in (versions_config or []):
        if entry.get("version") == version:
            return entry
    return None


def merge_value_mappings(base: list, override: list) -> list:
    """Merge a base list of value mappings with a per-version override list.

    Entries are keyed by `path`: an override replaces the base entry with the
    same path (in place), and any override paths not present in the base are
    appended. This lets a new version tweak/add individual property paths from
    configuration without restating the whole mapping list.
    """
    base = list(base or [])
    override = list(override or [])
    if not override:
        return base
    override_by_path = {m.get("path"): m for m in override}
    merged, seen = [], set()
    for mapping in base:
        path = mapping.get("path")
        merged.append(override_by_path.get(path, mapping))
        seen.add(path)
    for mapping in override:
        if mapping.get("path") not in seen:
            merged.append(mapping)
    return merged


def _field(source, name):
    """Read a named field from a dict or an object."""
    if isinstance(source, dict):
        return source.get(name)
    return getattr(source, name, None)


def get_field_path(source, path: str):
    """Resolve a dotted field path (e.g. ``submodel.url``) against a dict or an
    object, returning None if any step along the way is missing/None."""
    current = source
    for part in path.split("."):
        if current is None:
            return None
        current = _field(current, part)
    return current


def condition_met(condition, source) -> bool:
    """Evaluate a `deployWhen` / `when` condition against the request `source`.

    ``None`` or the literal ``"always"`` is always true. Any other string is a
    dotted request-field path and the condition holds when the resolved value is
    truthy (e.g. ``"submodel.url"`` -> only when a submodel URL was supplied).
    This keeps component gating fully config-driven — no flag is hard-coded.
    """
    if condition is None or condition == "always":
        return True
    if isinstance(condition, str):
        return bool(get_field_path(source, condition))
    raise ValueError(f"Unsupported deploy/when condition: {condition!r}")


def _resolve_mapping_value(mapping: dict, source):
    """Resolve a single mapping's value from a source field (`from`), a literal
    (`value`) or a `{placeholder}`-template, applying an optional `transform`."""
    if "value" in mapping:
        value = mapping["value"]
    elif "template" in mapping:
        value = render_template(mapping["template"], source)
    elif "from" in mapping:
        # Dotted paths supported (e.g. "submodel.url"); flat names work too.
        value = get_field_path(source, mapping["from"])
    else:
        raise ValueError(
            f"Value mapping for path '{mapping.get('path')}' must define one of: from / value / template"
        )

    transform = mapping.get("transform")
    if transform == "urlencode":
        value = urllib.parse.quote_plus(str(value))
    elif transform == "listtomap":
        # Adapt a list of single-/multi-key maps into one map, e.g. annotations
        # authored as a YAML list -> the map shape Helm ingress values expect.
        merged = {}
        for item in (value or []):
            if not isinstance(item, dict):
                raise ValueError(
                    f"transform 'listtomap' expects a list of maps for path "
                    f"'{mapping.get('path')}', got item: {item!r}"
                )
            merged.update(item)
        value = merged
    elif transform:
        raise ValueError(f"Unknown transform '{transform}' for path '{mapping.get('path')}'")
    return value


def _ensure_list_index(target: list, index: int) -> None:
    """Grow `target` with None placeholders until `index` is addressable."""
    while len(target) <= index:
        target.append(None)


def _parse_path(path: str) -> list:
    """Parse a dotted path into ``(key, index|None)`` segments."""
    segments = []
    for part in path.split("."):
        match = _PATH_SEGMENT.match(part)
        if not match:
            raise ValueError(f"Invalid value mapping path segment '{part}' in '{path}'")
        index = match.group(2)
        segments.append((match.group(1), int(index) if index is not None else None))
    return segments


def _child_container(parent: dict, key: str, expected_type: type, path: str):
    """Return ``parent[key]``, creating it as `expected_type` when absent. Raise a
    clear error if it exists but is an incompatible type, so a config path that
    collides with the base template's shape fails loudly here rather than with an
    opaque error deeper in the walk."""
    existing = parent.get(key)
    if existing is None:
        existing = parent[key] = expected_type()
    elif not isinstance(existing, expected_type):
        raise ValueError(
            f"Cannot apply path '{path}': key '{key}' is a {type(existing).__name__}, "
            f"expected {expected_type.__name__}"
        )
    return existing


def _set_by_path(root: dict, path: str, value, mode: str = "set") -> None:
    """Set `value` at a dotted `path` in `root`, creating intermediate dicts and
    lists as needed. Supports list indices (``a.b[0].c``) and ``mode='append'``
    for list-valued leaves. Existing sibling keys are preserved; a structural
    conflict with the base template raises a clear ValueError."""
    segments = _parse_path(path)
    last = len(segments) - 1
    cursor = root
    for position, (key, index) in enumerate(segments):
        is_last = position == last
        if index is None:
            if not is_last:
                cursor = _child_container(cursor, key, dict, path)
            elif mode == "append":
                _child_container(cursor, key, list, path).append(value)
            else:
                cursor[key] = value
        else:
            container = _child_container(cursor, key, list, path)
            _ensure_list_index(container, index)
            if is_last:
                container[index] = value
            else:
                if container[index] is None:
                    container[index] = {}
                elif not isinstance(container[index], dict):
                    raise ValueError(
                        f"Cannot apply path '{path}': '{key}[{index}]' is a "
                        f"{type(container[index]).__name__}, expected a map"
                    )
                cursor = container[index]


def apply_value_mappings(data: dict, source, value_mappings: list) -> None:
    """Apply config-driven property assignments onto the loaded values `data`.

    Each mapping is `{path, (from|value|template), transform?, mode?, when?}`.
    `when` gates a mapping on a condition evaluated against `source` (see
    `condition_met`). This keeps property assignment fully data-driven and
    component agnostic: a new component or chart version with different property
    paths is handled in configuration only.
    """
    for mapping in (value_mappings or []):
        if not condition_met(mapping.get("when"), source):
            continue
        path = mapping.get("path")
        if not path:
            raise ValueError(f"Value mapping is missing required 'path': {mapping}")
        value = _resolve_mapping_value(mapping, source)
        _set_by_path(data, path, value, mode=mapping.get("mode", "set"))


def render_values(source, template_path: str, value_mappings: list = None) -> dict:
    """Render a deployment's Helm values as an in-memory dict.

    The base values template at `template_path` is loaded and overlaid with the
    config-driven `value_mappings` resolved against `source`. The result is
    returned as a dict so it can be handed straight to the Helm client over stdin
    — no temporary values file is written to disk.

    Generic by design: `source` may be any object/dict and the mappings carry no
    component-specific logic, so the same path serves connectors and other
    components alike. When `template_path` is empty the values start from an empty
    dict (the chart's own defaults apply, overlaid only with the mappings).
    """
    if template_path:
        with open(os.path.abspath(template_path), "r") as file:
            data = yaml.safe_load(file) or {}
    else:
        data = {}
    apply_value_mappings(data, source, value_mappings or [])
    return data
