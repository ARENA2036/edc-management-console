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
    };
  }
}

function isUsableValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  return !value.startsWith('__');
}

export function getRuntimeConfigValue(
  envValue: string | undefined,
  runtimeValue: string | undefined,
  fallback = '',
): string {
  if (isUsableValue(envValue)) {
    return envValue as string;
  }

  if (isUsableValue(runtimeValue)) {
    return runtimeValue as string;
  }

  return fallback;
}
