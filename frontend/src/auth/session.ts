/********************************************************************************
# Tractus-X - EDC Management Console
#
# Copyright (c) 2026 ARENA2036 e.V.
# Copyright (c) 2026 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
********************************************************************************/

import { useEffect, useState } from 'react';
import { isAuthDisabled } from './keycloak';
import { dataspaceApi } from '../api/client';

export interface SessionIdentity {
  username: string;
  name: string;
  bpn: string;
  company: string;
  roles: string[];
  isAdmin: boolean;
}

export const EMPTY_IDENTITY: SessionIdentity = {
  username: '',
  name: '',
  bpn: '',
  company: '',
  roles: [],
  isAdmin: false,
};

export async function fetchSessionIdentity(): Promise<SessionIdentity | null> {
  if (isAuthDisabled()) {
    return { ...EMPTY_IDENTITY, isAdmin: true };
  }

  try {
    const response = await dataspaceApi.getDataspace();
    const session = response.data?.data?.session as Partial<SessionIdentity> | undefined;
    if (!session) {
      return null;
    }

    return {
      ...EMPTY_IDENTITY,
      ...session,
      bpn: (session.bpn ?? '').toUpperCase(),
    };
  } catch (error) {
    console.error('Failed to load the session identity:', error);
    return null;
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

      setIdentity(resolved ?? EMPTY_IDENTITY);
      if (resolved && !resolved.bpn && !isAuthDisabled()) {
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
