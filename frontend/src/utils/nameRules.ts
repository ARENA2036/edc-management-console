export const MIN_RESOURCE_NAME_LENGTH = 3;
export const MAX_RESOURCE_NAME_LENGTH = 20;
export const MAX_CONNECTORS = 3;

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
