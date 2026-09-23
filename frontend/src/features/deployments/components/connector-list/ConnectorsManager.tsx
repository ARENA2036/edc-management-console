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

import { Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import DataTable from '../../../../components/ui/DataTable';
import EmptyState from '../../../../components/ui/EmptyState';
import SectionCard from '../../../../components/ui/SectionCard';
import { useI18n } from '../../../../i18n';
import YamlViewModal from '../YamlViewModal';

import ConnectorDetailsModal from './ConnectorDetailsModal';
import ConnectorRow from './ConnectorRow';
import { toConnectorRows } from './rows';

import type { DashboardConnector } from '../../../../types';

interface Props {
  connectors: DashboardConnector[];
  onDelete: (connector: DashboardConnector) => Promise<void> | void;
  canManage?: boolean;
}

/** The connector table with its detail, YAML and delete dialogs. */
export default function ConnectorsManager({ connectors, onDelete, canManage = true }: Props) {
  const { t } = useI18n();
  const [detailsFor, setDetailsFor] = useState<DashboardConnector | null>(null);
  const [yamlFor, setYamlFor] = useState<DashboardConnector | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<DashboardConnector | null>(null);

  const rows = useMemo(() => toConnectorRows(connectors, t), [connectors, t]);

  return (
    <>
      <SectionCard
        icon={<Zap size={18} />}
        iconClass="bg-orange-500"
        title={t('edcConnectors')}
        subtitle={t('connectorsSectionSubtitle')}
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={<Zap size={28} />}
            iconClass="bg-orange-50 text-orange-500 dark:bg-orange-500/10"
            title={t('noConnectorsTitle')}
            description={t('noConnectorsDescription')}
            minHeightClass="min-h-[320px]"
          />
        ) : (
          <DataTable
            headers={[
              t('tableName'),
              t('tableVersion'),
              t('tableType'),
              t('tableStatus'),
              t('tableEndpoint'),
              t('tableActions'),
            ]}
          >
            {rows.map((connector) => (
              <ConnectorRow
                key={connector.id}
                connector={connector}
                canManage={canManage}
                onShowYaml={() => setYamlFor(connector)}
                onShowDetails={() => setDetailsFor(connector)}
                onDelete={() => setDeleteCandidate(connector)}
              />
            ))}
          </DataTable>
        )}
      </SectionCard>

      {detailsFor && (
        <ConnectorDetailsModal connector={detailsFor} onClose={() => setDetailsFor(null)} />
      )}

      {yamlFor && (
        <YamlViewModal connector={yamlFor} components={[]} onClose={() => setYamlFor(null)} />
      )}

      <ConfirmDialog
        open={deleteCandidate !== null}
        title={t('deleteConnectorTitle')}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) {
            void onDelete(deleteCandidate);
          }
          setDeleteCandidate(null);
        }}
      >
        <p>{t('connectorDeleteIntro', { name: deleteCandidate?.name ?? '' })}</p>
        <p>{t('connectorDeleteBody')}</p>
      </ConfirmDialog>
    </>
  );
}
