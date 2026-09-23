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

import DetailList from '../../../../components/ui/DetailList';
import Modal from '../../../../components/ui/Modal';
import { useI18n } from '../../../../i18n';
import { statusBadgeClass, statusLabel } from '../../../../utils/status';

import type { Connector } from '../../../../types';

/** Everything the console knows about one connector. */
export default function ConnectorDetailsModal({
  connector,
  onClose,
}: {
  connector: Connector;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <Modal open title={t('details')} onClose={onClose}>
      <DetailList
        items={[
          {
            label: t('tableName'),
            value: <p className="text-lg font-medium">{connector.name}</p>,
            copyValue: connector.name,
          },
          {
            label: t('tableEndpoint'),
            value: (
              <p className="break-all font-mono text-sm text-gray-700 dark:text-slate-300">
                {connector.url}
              </p>
            ),
            copyValue: connector.url,
          },
          {
            label: t('bpnLabel'),
            value: <p className="text-lg font-medium">{connector.bpn || t('noValue')}</p>,
            copyValue: connector.bpn || undefined,
          },
          {
            label: t('tableStatus'),
            value: (
              <span
                className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(
                  connector.status,
                )}`}
              >
                {statusLabel(connector.status, t)}
              </span>
            ),
          },
        ]}
      />
    </Modal>
  );
}
