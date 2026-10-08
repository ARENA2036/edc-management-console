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

import { Boxes } from 'lucide-react';
import { useMemo, useState } from 'react';

import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import DataTable from '../../../../components/ui/DataTable';
import EmptyState from '../../../../components/ui/EmptyState';
import SectionCard from '../../../../components/ui/SectionCard';
import { useI18n } from '../../../../i18n';

import ComponentDetailsModal from './ComponentDetailsModal';
import ComponentRow from './ComponentRow';

import type { ManagedComponent } from '../../../../types';

interface Props {
  components: ManagedComponent[];
  onDelete: (component: ManagedComponent) => Promise<void> | void;
  canManage?: boolean;
}

/** The services table with its detail and delete dialogs, newest first. */
export default function ComponentsManager({ components, onDelete, canManage = true }: Props) {
  const { t } = useI18n();
  const [detailsFor, setDetailsFor] = useState<ManagedComponent | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ManagedComponent | null>(null);

  const rows = useMemo(
    () => [...components].sort((a, b) => b.deployedAt.localeCompare(a.deployedAt)),
    [components],
  );

  return (
    <>
      <SectionCard
        icon={<Boxes size={18} />}
        iconClass="bg-blue-500"
        title={t('componentsServices')}
        subtitle={t('componentsSectionSubtitle')}
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={<Boxes size={28} />}
            iconClass="bg-blue-50 text-blue-500 dark:bg-blue-500/10"
            title={t('noComponentsTitle')}
            description={t('noComponentsDescription')}
          />
        ) : (
          <DataTable
            headers={[
              t('tableName'),
              t('tableType'),
              t('tableVersion'),
              t('tableStatus'),
              t('tableActions'),
            ]}
          >
            {rows.map((component) => (
              <ComponentRow
                key={component.id}
                component={component}
                canManage={canManage}
                onShowDetails={() => setDetailsFor(component)}
                onDelete={() => setDeleteCandidate(component)}
              />
            ))}
          </DataTable>
        )}
      </SectionCard>

      {detailsFor && (
        <ComponentDetailsModal component={detailsFor} onClose={() => setDetailsFor(null)} />
      )}

      <ConfirmDialog
        open={deleteCandidate !== null}
        title={t('deleteComponentTitle')}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) {
            void onDelete(deleteCandidate);
          }
          setDeleteCandidate(null);
        }}
      >
        <p>{t('deleteComponentMessage', { name: deleteCandidate?.name ?? '' })}</p>
        <p>{t('deleteComponentFollowup')}</p>
      </ConfirmDialog>
    </>
  );
}
