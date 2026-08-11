import { useEffect, useState } from 'react';
import { isAuthDisabled } from './keycloak';
import { dataspaceApi } from '../api/client';

export interface SessionIdentity {
  username: string;
  name: string;
  bpn: string;
  company: string;
  /** Whether the backend refuses a deployment that is not under the caller's BPN. */
  enforceSessionBpn: boolean;
}

export const EMPTY_IDENTITY: SessionIdentity = {
  username: '',
  name: '',
  bpn: '',
  company: '',
  enforceSessionBpn: false,
};

export async function fetchSessionIdentity(): Promise<SessionIdentity> {
  if (isAuthDisabled()) {
    return EMPTY_IDENTITY;
  }

  try {
    const response = await dataspaceApi.getDataspace();
    const session = response.data?.data?.session as Partial<SessionIdentity> | undefined;
    if (!session) {
      return EMPTY_IDENTITY;
    }

    return {
      ...EMPTY_IDENTITY,
      ...session,
      bpn: (session.bpn ?? '').toUpperCase(),
    };
  } catch (error) {
    console.error('Failed to load the session identity:', error);
    return EMPTY_IDENTITY;
  }
}

export function useSessionIdentity() {
  const [identity, setIdentity] = useState<SessionIdentity>(EMPTY_IDENTITY);

  useEffect(() => {
    let active = true;

    fetchSessionIdentity().then((resolved) => {
      if (!active) {
        return;
      }

      setIdentity(resolved);
      if (!resolved.bpn) {
        // Not an error — a realm may simply not map it. Each Keycloak client
        // needs its own mappers, so this is the first thing to check when a
        // different environment shows no company.
        console.warn(
          '[EMC] No BPN in the session. Add "bpn" and "organisation" User Attribute ' +
            'mappers to this application\'s client in the identity provider.',
        );
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return { identity };
}
