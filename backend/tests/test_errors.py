"""Tests for the error taxonomy and the HTTP error envelope.

No cluster, helm or network access is required - classification is pure given
an exception, and the envelope is built from it.

The classification table is ordered and first-match-wins, so a rule inserted in
the wrong position silently changes status codes for its neighbours. The
parametrised cases below pin every rule against realistic Helm/kubectl output,
which is what makes that table safe to extend.
"""
import pytest

from utilities import errors
from utilities.errors import EmcError, Stage
from utilities.httpUtils import HttpUtils

CLASSIFICATION_CASES = [
    ('exec: "helm": executable file not found in $PATH',
     503, "HELM_BINARY_MISSING", Stage.HELM),
    ('Kubernetes cluster unreachable: Get "https://10.0.0.1/version": '
     'dial tcp 10.0.0.1:443: connect: connection refused',
     503, "CLUSTER_UNREACHABLE", Stage.CLUSTER),
    ('Error: context "arena-dev" does not exist',
     503, "KUBECONFIG_INVALID", Stage.CLUSTER),
    ('pods is forbidden: User "system:serviceaccount:emc:emc" cannot create resource "pods"',
     502, "CLUSTER_FORBIDDEN", Stage.CLUSTER),
    ('Error: namespaces "dataspace" not found',
     422, "NAMESPACE_NOT_FOUND", Stage.CLUSTER),
    ('pods "edc-1" is forbidden: exceeded quota: compute-resources',
     503, "CLUSTER_RESOURCE_EXHAUSTED", Stage.CLUSTER),
    ('Back-off pulling image "tractusx/edc:0.9.9": ImagePullBackOff',
     502, "IMAGE_PULL_FAILED", Stage.CLUSTER),
    ('Error: another operation (install/upgrade/rollback) is in progress',
     409, "RELEASE_LOCKED", Stage.HELM),
    ('Error: cannot re-use a name that is still in use',
     409, "RELEASE_NAME_IN_USE", Stage.HELM),
    ('Error: UPGRADE FAILED: "edc-1" has no deployed releases',
     409, "RELEASE_NOT_DEPLOYED", Stage.HELM),
    ('Error: release: not found',
     404, "RELEASE_NOT_FOUND", Stage.HELM),
    ('Error: chart "tractusx-connector" version "9.9.9" not found in repo',
     502, "CHART_NOT_FOUND", Stage.HELM),
    ('Error: no cached repo found. (try running `helm repo update`)',
     502, "HELM_REPO_UNAVAILABLE", Stage.HELM),
    ("Error: values don't meet the specifications of the schema",
     422, "CHART_VALUES_INVALID", Stage.HELM),
    ('Error: UPGRADE FAILED: timed out waiting for the condition',
     504, "DEPLOYMENT_TIMEOUT", Stage.HELM),
]


@pytest.mark.parametrize("text,status,code,stage", CLASSIFICATION_CASES)
def test_classify_maps_tool_output_to_status_code_and_stage(text, status, code, stage):
    error = errors.classify(Exception(text), stage=Stage.HELM)
    assert (error.status, error.code, error.stage) == (status, code, stage)


def test_every_rule_has_a_test_case():
    """Guards against adding a rule without pinning it here."""
    covered = {code for _, _, code, _ in CLASSIFICATION_CASES}
    declared = {code for _, _, code, _, _ in errors._RULES}
    assert declared - covered == set(), f"rules with no test case: {declared - covered}"


def test_quota_rule_wins_over_forbidden_rule():
    """Both patterns match 'is forbidden: exceeded quota'. Order decides, and
    'out of quota' is the actionable cause - not 'RBAC denied'."""
    error = errors.classify(Exception('is forbidden: exceeded quota: compute-resources'))
    assert error.code == "CLUSTER_RESOURCE_EXHAUSTED"


def test_a_precise_rule_overrides_the_caller_stage_hint():
    """A cluster outage during a Helm install is a cluster problem, not a Helm one."""
    error = errors.classify(Exception("Kubernetes cluster unreachable"), stage=Stage.HELM)
    assert error.stage == Stage.CLUSTER


def test_unrecognised_failure_stays_a_server_fault():
    """The central safety property: never guess a 4xx. Downgrading an unknown
    fault would disguise a backend bug as user error."""
    error = errors.classify(RuntimeError("something entirely unexpected"))
    assert (error.status, error.code, error.stage) == (500, "INTERNAL_ERROR", Stage.INTERNAL)
    assert error.is_server_fault is True


def test_already_classified_errors_pass_through_unchanged():
    original = errors.ComponentLimitExceeded("at the cap")
    assert errors.classify(original) is original
    assert (original.status, original.code) == (409, "COMPONENT_LIMIT_REACHED")
    assert original.is_server_fault is False


def test_subclass_defaults_are_the_documented_contract():
    assert (errors.DuplicateComponentName("x").status,
            errors.DuplicateComponentName("x").code) == (400, "DUPLICATE_COMPONENT_NAME")
    assert (errors.UnsupportedVersion("x").status,
            errors.UnsupportedVersion("x").code) == (400, "VERSION_UNSUPPORTED")
    assert (errors.UnknownComponentType("x").status,
            errors.UnknownComponentType("x").code) == (400, "COMPONENT_TYPE_UNKNOWN")
    misconfigured = errors.ComponentMisconfigured("x")
    assert (misconfigured.status, misconfigured.stage) == (500, Stage.CONFIG)


def test_instance_overrides_beat_class_defaults():
    error = EmcError("boom", status=418, code="TEAPOT", stage=Stage.HELM)
    assert (error.status, error.code, error.stage) == (418, "TEAPOT", Stage.HELM)


def test_timeout_error_without_a_message_is_still_classified():
    """A bare asyncio/socket TimeoutError has no text for the rules to match."""
    error = errors.classify(TimeoutError(), stage=Stage.HELM)
    assert (error.status, error.code) == (504, "DEPLOYMENT_TIMEOUT")


def test_describe_keeps_the_type_when_the_message_is_empty():
    assert errors.describe(KeyError("name")) == "KeyError: 'name'"
    assert errors.describe(RuntimeError()) == "RuntimeError"

@pytest.mark.parametrize("raw,secret", [
    ("values: {db_password: hunter2}", "hunter2"),
    ('client_secret: "s3cr3t"', "s3cr3t"),
    ("X-Api-Key=topsecret", "topsecret"),
    ("bearerToken: abc.def.ghi", "abc.def.ghi"),
    ("postgres://edc:pgpassword@db:5432/edc", "pgpassword"),
])
def test_redact_masks_credentials(raw, secret):
    assert secret not in errors.redact(raw)
    assert errors.REDACTED in errors.redact(raw)


def test_redact_preserves_non_secret_context():
    """Over-redacting would make details useless - the point is to keep the
    diagnostic text and drop only the credential."""
    out = errors.redact("release edc-1 in namespace dataspace: db_password: hunter2")
    assert "edc-1" in out and "dataspace" in out and "hunter2" not in out


def test_redact_truncates_and_handles_empty():
    assert errors.redact("") == ""
    assert errors.redact(None) == ""
    out = errors.redact("x" * (errors.MAX_DETAIL_CHARS + 500))
    assert out.endswith("... [truncated]")
    assert len(out) < errors.MAX_DETAIL_CHARS + 50


def test_error_ids_are_short_and_unique():
    ids = {errors.new_error_id() for _ in range(100)}
    assert len(ids) == 100
    assert all(len(value) == 12 for value in ids)

def body(response):
    """JSONResponse keeps the dict it was built from on `.body` as bytes; the
    original mapping is easier to assert against."""
    import json
    return json.loads(response.body.decode())


def test_legacy_two_argument_call_still_works_and_is_completed():
    """Backwards compatibility: existing call sites pass only status+message."""
    payload = body(HttpUtils.get_error_response(status=404, message="Component not found"))
    assert payload["error"] == "Component not found"
    assert payload["status"] == 404
    # Filled in rather than left absent, so clients can rely on the fields.
    assert payload["code"] == "NOT_FOUND"
    assert payload["stage"] == Stage.REQUEST


def test_envelope_carries_code_stage_detail_and_hint():
    response = HttpUtils.from_error(
        errors.ComponentLimitExceeded("at the cap", hint="delete one"), error_id="abc123")
    payload = body(response)
    assert response.status_code == 409
    assert payload["code"] == "COMPONENT_LIMIT_REACHED"
    assert payload["stage"] == Stage.REQUEST
    assert payload["hint"] == "delete one"
    assert payload["errorId"] == "abc123"


def test_error_response_classifies_raw_tool_output():
    response = HttpUtils.error_response(
        Exception('Error: namespaces "dataspace" not found'), stage=Stage.HELM)
    payload = body(response)
    assert response.status_code == 422
    assert payload["code"] == "NAMESPACE_NOT_FOUND"
    assert payload["stage"] == Stage.CLUSTER
    assert payload["errorId"]


def test_error_response_redacts_detail_on_the_way_out():
    """Redaction must happen in the response layer, not at the call site, so no
    path can emit an unsanitised detail."""
    response = HttpUtils.error_response(
        Exception("template error: db_password: hunter2"), stage=Stage.HELM)
    assert "hunter2" not in response.body.decode()


def test_unauthorized_envelope_names_the_auth_stage():
    payload = body(HttpUtils.get_not_authorized())
    assert (payload["status"], payload["code"], payload["stage"]) == (
        401, "NOT_AUTHORIZED", Stage.AUTH)


def test_success_response_shape_is_untouched():
    response = HttpUtils.response(data=[1, 2], status=200, message="ok")
    assert response.status_code == 200
    assert body(response) == {"message": "ok", "data": [1, 2]}
