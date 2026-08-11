declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      apiUrl?: string;
      apiKey?: string;
      edcHost?: string;
      keycloakUrl?: string;
      realm?: string;
      clientId?: string;
      sdeUrl?: string;
      portalUrl?: string;
      disableAuth?: boolean;
    };
  }
}

function isUsableValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  return !(
    value.startsWith('__') ||
    (value.startsWith('${') && value.endsWith('}'))
  );
}

export function getRuntimeConfigValue(
  envValue: string | undefined,
  runtimeValue: string | undefined,
  fallback = '',
): string {
  if (isUsableValue(runtimeValue)) {
    return runtimeValue as string;
  }

  if (isUsableValue(envValue)) {
    return envValue as string;
  }

  return fallback;
}

function parseBoolean(value: boolean | string | undefined) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

export function getRuntimeConfigBoolean(
  envValue: string | undefined,
  runtimeValue: boolean | string | undefined,
  fallback = false,
) {
  const runtimeBoolean = parseBoolean(runtimeValue);
  if (runtimeBoolean !== undefined) {
    return runtimeBoolean;
  }

  const envBoolean = parseBoolean(envValue);
  if (envBoolean !== undefined) {
    return envBoolean;
  }

  return fallback;
}
