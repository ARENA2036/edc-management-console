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

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { toApiError } from '../../api/errors';
import AddComponentDialog from '../../components/AddComponentDialog';
import ComponentWizard, { type ComponentType } from '../../components/ComponentWizard';
import ComponentsManager from '../../components/ComponentsManager';
import ConnectorsManager from '../../components/ConnectorsManager';
import DeploymentStatusModal from '../../components/DeploymentStatusModal';
import DeploymentWizard from '../../components/DeploymentWizard';
import { ErrorBanner } from '../../components/ErrorDetails';
import Tooltip from '../../components/Tooltip';
import { useI18n } from '../../i18n';
import type { SessionIdentity } from '../../auth/session';
import type { DashboardConnector } from '../../types';
import { useDataspaceSummary } from '../dataspace/useDataspace';
import { resolveComponentLimits, countComponentsByType } from '../deployments/model';
import { useDeploymentActions } from '../deployments/useDeploymentActions';
import { useDeploymentState } from '../deployments/useDeploymentState';
import DashboardStats from './DashboardStats';
import type { DeploymentFeedback } from './types';

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

  const componentCounts = useMemo(() => countComponentsByType(components), [components]);
  const connectorLimitReached = connectors.length >= limits.connector;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeploymentWizard, setShowDeploymentWizard] = useState(false);
  const [showComponentWizard, setShowComponentWizard] = useState(false);
  const [connectorDeploymentInFlight, setConnectorDeploymentInFlight] = useState(false);
  const [componentDeploymentInFlight, setComponentDeploymentInFlight] = useState(false);
  const [deploymentFeedback, setDeploymentFeedback] = useState<DeploymentFeedback>({
    open: false,
    status: 'deploying',
    resource: 'connector',
    itemCount: 1,
  });
  const [componentWizardDefaults, setComponentWizardDefaults] = useState<{
    allowMultipleTypes?: boolean;
    initialSelectedTypes?: ComponentType[];
    startAtConfiguration?: boolean;
  }>({});

  const openComponentWizard = () => {
    setComponentWizardDefaults({ allowMultipleTypes: true });
    setShowComponentWizard(true);
  };

  const handleDeployConnector = async (connector: DashboardConnector) => {
    setConnectorDeploymentInFlight(true);
    setDeploymentFeedback({
      open: true,
      status: 'deploying',
      resource: 'connector',
      itemCount: 1,
    });

    try {
      const deployed = await deployConnector(connector);
      if (deployed) {
        setShowDeploymentWizard(false);
        setDeploymentFeedback({
          open: true,
          status: 'success',
          resource: 'connector',
          itemCount: 1,
        });
      }
    } catch (error) {
      setDeploymentFeedback({
        open: true,
        status: 'error',
        resource: 'connector',
        itemCount: 1,
        error: toApiError(error, 'The connector could not be deployed.'),
      });
    } finally {
      setConnectorDeploymentInFlight(false);
    }
  };

  const addGuidance = {
    title: t('statsAddTitle'),
    content: t('statsAddContent'),
    items: [
      t('statsAddItemConnector'),
      t('statsAddItemComponent'),
      t('statsAddItemValues'),
    ],
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
              onClick={() => setShowAddDialog(true)}
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
            onAddComponent={() => openComponentWizard()}
            canManage={identity.isAdmin}
          />
          <ComponentsManager
            components={components}
            onDelete={deleteComponent}
            canManage={identity.isAdmin}
          />
        </div>
      </div>

      <AddComponentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        connectorCount={connectors.length}
        connectorLimit={limits.connector}
        digitalTwinRegistryCount={componentCounts.digitalTwinRegistry}
        digitalTwinRegistryLimit={limits.digitalTwinRegistry}
        submodelServiceCount={componentCounts.submodelServer}
        submodelServiceLimit={limits.submodelServer}
        onSelectEDC={() => {
          setShowAddDialog(false);
          if (!connectorLimitReached) {
            setShowDeploymentWizard(true);
          }
        }}
        onSelectComponent={() => {
          setShowAddDialog(false);
          openComponentWizard();
        }}
      />

      <DeploymentWizard
        open={showDeploymentWizard}
        onOpenChange={setShowDeploymentWizard}
        onDeploy={handleDeployConnector}
        connectorCount={connectors.length}
        deploying={connectorDeploymentInFlight}
        existingConnectorNames={connectors.map((connector) => connector.name)}
        defaultVersion={dataspace.details?.deployment?.connector?.defaultVersion}
        availableVersions={dataspace.details?.deployment?.connector?.availableVersions}
        prefilledBpn={identity.bpn}
        defaultApiEndpoint={
          dataspace.details?.edc?.controlplane_url || dataspace.details?.edc?.default_url
        }
        defaultDataPlaneUrl={dataspace.details?.edc?.dataplane_url}
        controlPlaneHostSuffix={dataspace.details?.edc?.controlplane_host_suffix}
        dataPlaneHostSuffix={dataspace.details?.edc?.dataplane_host_suffix}
      />

      <ComponentWizard
        open={showComponentWizard}
        onOpenChange={(open) => {
          setShowComponentWizard(open);
          if (!open) {
            setComponentWizardDefaults({});
          }
        }}
        onDeploy={async (component) => {
          setComponentDeploymentInFlight(true);
          setDeploymentFeedback({
            open: true,
            status: 'deploying',
            resource: 'component',
            itemCount: 1,
          });
          try {
            await deployComponent(component);
            setShowComponentWizard(false);
            setDeploymentFeedback({
              open: true,
              status: 'success',
              resource: 'component',
              itemCount: 1,
            });
          } catch (error) {
            setDeploymentFeedback({
              open: true,
              status: 'error',
              resource: 'component',
              itemCount: 1,
              error: toApiError(error, 'The component could not be deployed.'),
            });
          } finally {
            setComponentDeploymentInFlight(false);
          }
        }}
        deploying={componentDeploymentInFlight}
        existingNames={[
          ...connectors.map((connector) => connector.name),
          ...components.map((component) => component.name),
        ]}
        defaultVersions={{
          connector: dataspace.details?.deployment?.connector?.defaultVersion,
          digitalTwinRegistry: dataspace.details?.deployment?.digitalTwinRegistry?.defaultVersion,
          submodelServer: dataspace.details?.deployment?.submodelServer?.defaultVersion,
        }}
        availableVersions={{
          connector: dataspace.details?.deployment?.connector?.availableVersions,
          digitalTwinRegistry:
            dataspace.details?.deployment?.digitalTwinRegistry?.availableVersions,
          submodelServer: dataspace.details?.deployment?.submodelServer?.availableVersions,
        }}
        allowMultipleTypes={componentWizardDefaults.allowMultipleTypes}
        initialSelectedTypes={componentWizardDefaults.initialSelectedTypes}
        startAtConfiguration={componentWizardDefaults.startAtConfiguration}
        typeCounts={{
          digitalTwinRegistry: componentCounts.digitalTwinRegistry,
          submodelServer: componentCounts.submodelServer,
        }}
        typeLimits={{
          digitalTwinRegistry: limits.digitalTwinRegistry,
          submodelServer: limits.submodelServer,
        }}
      />

      <DeploymentStatusModal
        open={deploymentFeedback.open}
        status={deploymentFeedback.status}
        resource={deploymentFeedback.resource}
        itemCount={deploymentFeedback.itemCount}
        error={deploymentFeedback.error}
        onClose={() =>
          setDeploymentFeedback((current) => ({
            ...current,
            open: false,
          }))
        }
      />    </>
  );
}
