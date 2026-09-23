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

import { Plus } from 'lucide-react';
import { useMemo } from 'react';

import { ErrorBanner } from '../../components/ui/ErrorDetails';
import Tooltip from '../../components/ui/Tooltip';
import { useI18n } from '../../i18n';
import { useDataspaceSummary } from '../dataspace/DataspaceContext';
import ComponentsManager from '../deployments/components/component-list/ComponentsManager';
import ConnectorsManager from '../deployments/components/connector-list/ConnectorsManager';
import { countComponentsByType, resolveComponentLimits } from '../deployments/model';
import { useDeploymentActions } from '../deployments/useDeploymentActions';
import { useDeploymentState } from '../deployments/useDeploymentState';

import DashboardDialogs from './DashboardDialogs';
import DashboardStats from './DashboardStats';
import { useDeploymentDialogs } from './useDeploymentDialogs';

import type { SessionIdentity } from '../../auth/session';

export default function Dashboard({ identity }: { identity: SessionIdentity }) {
  const { t } = useI18n();
  const { dataspace } = useDataspaceSummary();
  const limits = useMemo(() => resolveComponentLimits(dataspace.details), [dataspace.details]);

  const deployments = useDeploymentState();
  const { connectors, components, loadError, lastSyncedAt } = deployments;
  const {
    actionError,
    dismissActionError,
    deployConnector,
    deployComponent,
    deleteConnector,
    deleteComponent,
  } = useDeploymentActions(deployments, limits);

  const dialogs = useDeploymentDialogs({ deployConnector, deployComponent });
  const componentCounts = useMemo(() => countComponentsByType(components), [components]);
  const connectorLimitReached = connectors.length >= limits.connector;

  const addGuidance = {
    title: t('statsAddTitle'),
    content: t('statsAddContent'),
    items: [t('statsAddItemConnector'), t('statsAddItemComponent'), t('statsAddItemValues')],
    footer: t('statsAddFooter'),
  };

  return (
    <>
      <div className="px-4 pb-12 pt-4 md:px-6 md:pb-16 md:pt-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t('dashboard')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('welcome')}</p>
        </div>

        <ErrorBanner
          error={actionError}
          title={t('errorActionFailedTitle')}
          onDismiss={dismissActionError}
        />
        <ErrorBanner
          error={loadError}
          tone="warning"
          title={t('errorStaleDataTitle')}
          onDismiss={deployments.dismissLoadError}
        />

        <DashboardStats
          dataspaceName={dataspace.name}
          authorityBpn={dataspace.authorityBpn}
          connectors={connectors}
          components={components}
          limits={limits}
          lastSyncedAt={lastSyncedAt}
        />

        {identity.isAdmin ? (
          <div className="mb-6 flex flex-wrap justify-end gap-3">
            <Tooltip
              title={addGuidance.title}
              content={addGuidance.content}
              items={addGuidance.items}
              footer={addGuidance.footer}
              position="left"
            >
              <button
                type="button"
                onClick={() => dialogs.setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-orange-600"
              >
                <Plus size={18} />
                {t('addButtonLabel')}
              </button>
            </Tooltip>
          </div>
        ) : null}

        <div className="space-y-6">
          <ConnectorsManager
            connectors={connectors}
            onDelete={deleteConnector}
            canManage={identity.isAdmin}
          />
          <ComponentsManager
            components={components}
            onDelete={deleteComponent}
            canManage={identity.isAdmin}
          />
        </div>
      </div>

      <DashboardDialogs
        dialogs={dialogs}
        identity={identity}
        details={dataspace.details}
        limits={limits}
        componentCounts={componentCounts}
        connectorNames={connectors.map((connector) => connector.name)}
        componentNames={components.map((component) => component.name)}
        connectorCount={connectors.length}
        connectorLimitReached={connectorLimitReached}
      />
    </>
  );
}
