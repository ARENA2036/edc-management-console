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

import type { Connector } from '../types';
import { useI18n } from '../i18n';
import EndpointWithCopy from './EndpointWithCopy';
import { PLANE_ORDER, planeEndpoints, type PlaneKey } from '../utils/endpoints';

interface Props {
  connector: Connector;
}

const LABEL_KEYS: Record<PlaneKey, 'controlPlaneEndpointLabel' | 'dataPlaneEndpointLabel'> = {
  controlPlane: 'controlPlaneEndpointLabel',
  dataPlane: 'dataPlaneEndpointLabel',
};

export default function PlaneEndpoints({ connector }: Props) {
  const { t } = useI18n();
  const endpoints = planeEndpoints(connector);
  const present = PLANE_ORDER.filter((plane) => endpoints[plane]);

  if (present.length === 0) {
    return <>{t('noValue')}</>;
  }

  return (
    <dl className="space-y-1.5">
      {present.map((plane) => (
        <div key={plane}>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
            {t(LABEL_KEYS[plane])}
          </dt>
          <dd className="mt-0.5">
            <EndpointWithCopy endpoint={endpoints[plane]} fallback={t('noValue')} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
