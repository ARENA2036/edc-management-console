export const MIN_RESOURCE_NAME_LENGTH = 3;
export const MAX_RESOURCE_NAME_LENGTH = 20;

export const MAX_CONNECTORS = 3;
export const MAX_DIGITAL_TWIN_REGISTRIES = 3;
export const MAX_SUBMODEL_SERVERS = 3;

export type ComponentLimitKey = 'connector' | 'digitalTwinRegistry' | 'submodelServer';

export const DEFAULT_COMPONENT_LIMITS: Record<ComponentLimitKey, number> = {
  connector: MAX_CONNECTORS,
  digitalTwinRegistry: MAX_DIGITAL_TWIN_REGISTRIES,
  submodelServer: MAX_SUBMODEL_SERVERS,
};

export function resolveComponentLimit(
  key: ComponentLimitKey,
  configured?: number | null,
): number {
  if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }

  return DEFAULT_COMPONENT_LIMITS[key];
}

const allowedNamePattern = /^[a-z0-9-]+$/;

export function normalizeResourceName(value: string) {
  return value.trim().toLowerCase();
}

export function buildResourceNamePreview(value: string) {
  return normalizeResourceName(value)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidResourceName(value: string) {
  const normalized = value.trim();

  if (
    normalized.length < MIN_RESOURCE_NAME_LENGTH
    || normalized.length > MAX_RESOURCE_NAME_LENGTH
  ) {
    return false;
  }

  if (/\s/.test(normalized)) {
    return false;
  }

  if (!allowedNamePattern.test(normalized)) {
    return false;
  }

  return !normalized.startsWith('-') && !normalized.endsWith('-');
}

export function buildGeneratedHostname(name: string, hostnameSuffix: string) {
  const normalized = buildResourceNamePreview(name);
  if (!normalized || !hostnameSuffix) {
    return '';
  }

  return `${normalized}-${hostnameSuffix}`;
}
