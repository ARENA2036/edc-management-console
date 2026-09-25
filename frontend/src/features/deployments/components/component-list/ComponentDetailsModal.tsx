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
import { formatTimestamp } from '../../../../utils/format';
import { statusLabel } from '../../../../utils/status';

import { componentTypeLabel } from './componentLabels';

import type { ManagedComponent } from '../../../../types';

/** Everything the console knows about one deployed service. */
export default function ComponentDetailsModal({
  component,
  onClose,
}: {
  component: ManagedComponent;
  onClose: () => void;
}) {
  const { language, t } = useI18n();

  const items = [
    { label: t('tableName'), value: component.name },
    { label: t('tableType'), value: componentTypeLabel(component.type, t) },
    { label: t('tableVersion'), value: component.version },
    ...(component.endpoint
      ? [
          {
            label: t('tableEndpoint'),
            value: <span className="break-all">{component.endpoint}</span>,
            copyValue: component.endpoint,
          },
        ]
      : []),
    { label: t('tableStatus'), value: statusLabel(component.status, t) },
    {
      label: t('deployedLabel'),
      value: formatTimestamp(component.deployedAt, language, t('noValue')),
    },
  ];

  return (
    <Modal open title={t('details')} widthClass="max-w-lg" onClose={onClose}>
      <DetailList items={items} />
    </Modal>
  );
}
