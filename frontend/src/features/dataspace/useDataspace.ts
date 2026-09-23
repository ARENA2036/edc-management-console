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

import { useI18n } from '../../i18n';
import { fetchDataspaceSummary } from './api';
import type { DataspaceSummary } from './types';

export function useDataspaceSummary() {
  const { t } = useI18n();
  const fallbackName = t('dataspaceFallback');
  const [dataspace, setDataspace] = useState<DataspaceSummary>({
    name: fallbackName,
    authorityBpn: '',
    details: null,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    fetchDataspaceSummary(fallbackName).then((summary) => {
      if (!active) {
        return;
      }

      setDataspace(summary);
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [fallbackName]);

  return { dataspace, loaded };
}
