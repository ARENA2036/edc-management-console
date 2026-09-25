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

import keycloak from '../auth/keycloak';
import { useSessionIdentity, type SessionIdentity } from '../auth/session';
import { useI18n } from '../i18n';

export interface CurrentUser {
  identity: SessionIdentity;
  /** Best available display name, falling back through the token's claims. */
  displayName: string;
}

export function useCurrentUser(): CurrentUser {
  const { t } = useI18n();
  const { identity } = useSessionIdentity();
  const claims = keycloak.tokenParsed;
  const fromClaims = `${claims?.given_name ?? ''} ${claims?.family_name ?? ''}`.trim();

  return {
    identity,
    displayName:
      identity.name
      || fromClaims
      || identity.username
      || claims?.preferred_username
      || t('userFallback'),
  };
}
