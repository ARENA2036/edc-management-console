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

import AddComponentDialog from '../deployments/components/AddComponentDialog';
import ComponentWizard from '../deployments/components/component-wizard/ComponentWizard';
import DeploymentWizard from '../deployments/components/deployment-wizard/DeploymentWizard';
import DeploymentStatusModal from '../deployments/components/DeploymentStatusModal';

import type { DeploymentDialogsState } from './useDeploymentDialogs';
import type { SessionIdentity } from '../../auth/session';
import type { DataspaceSettingsPayload } from '../dataspace/types';
import type { ComponentLimits } from '../deployments/model';

interface Props {
  dialogs: DeploymentDialogsState;
  identity: SessionIdentity;
  details: DataspaceSettingsPayload | null;
  limits: ComponentLimits;
  componentCounts: Record<'digitalTwinRegistry' | 'submodelServer', number>;
  connectorNames: string[];
  componentNames: string[];
  connectorCount: number;
  connectorLimitReached: boolean;
}

export default function DashboardDialogs({
  dialogs,
  identity,
  details,
  limits,
  componentCounts,
  connectorNames,
  componentNames,
  connectorCount,
  connectorLimitReached,
}: Props) {
  return (
    <>
    <AddComponentDialog
      open={dialogs.addOpen}
      onOpenChange={dialogs.setAddOpen}
      connectorCount={connectorCount}
      connectorLimit={limits.connector}
      digitalTwinRegistryCount={componentCounts.digitalTwinRegistry}
      digitalTwinRegistryLimit={limits.digitalTwinRegistry}
      submodelServiceCount={componentCounts.submodelServer}
      submodelServiceLimit={limits.submodelServer}
      onSelectEDC={() => {
        dialogs.setAddOpen(false);
        if (!connectorLimitReached) {
          dialogs.setConnectorWizardOpen(true);
        }
      }}
      onSelectComponent={() => {
        dialogs.setAddOpen(false);
        dialogs.openComponentWizard();
      }}
    />

    <DeploymentWizard
      open={dialogs.connectorWizardOpen}
      onOpenChange={dialogs.setConnectorWizardOpen}
      onDeploy={dialogs.submitConnector}
      connectorCount={connectorCount}
      deploying={dialogs.connectorInFlight}
      existingConnectorNames={connectorNames}
      defaultVersion={details?.deployment?.connector?.defaultVersion}
      availableVersions={details?.deployment?.connector?.availableVersions}
      prefilledBpn={identity.bpn}
      defaultApiEndpoint={
        details?.edc?.controlplane_url || details?.edc?.default_url
      }
      defaultDataPlaneUrl={details?.edc?.dataplane_url}
      controlPlaneHostSuffix={details?.edc?.controlplane_host_suffix}
      dataPlaneHostSuffix={details?.edc?.dataplane_host_suffix}
    />

    <ComponentWizard
      open={dialogs.componentWizardOpen}
      onOpenChange={(open) => {
        dialogs.setComponentWizardOpen(open);
        if (!open) {
          dialogs.clearComponentWizardDefaults();
        }
      }}
      onDeploy={dialogs.submitComponent}
      deploying={dialogs.componentInFlight}
      existingNames={[...connectorNames, ...componentNames]}
      defaultVersions={{
        connector: details?.deployment?.connector?.defaultVersion,
        digitalTwinRegistry: details?.deployment?.digitalTwinRegistry?.defaultVersion,
        submodelServer: details?.deployment?.submodelServer?.defaultVersion,
      }}
      availableVersions={{
        connector: details?.deployment?.connector?.availableVersions,
        digitalTwinRegistry:
          details?.deployment?.digitalTwinRegistry?.availableVersions,
        submodelServer: details?.deployment?.submodelServer?.availableVersions,
      }}
      allowMultipleTypes={dialogs.componentWizardDefaults.allowMultipleTypes}
      initialSelectedTypes={dialogs.componentWizardDefaults.initialSelectedTypes}
      startAtConfiguration={dialogs.componentWizardDefaults.startAtConfiguration}
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
      open={dialogs.feedback.open}
      status={dialogs.feedback.status}
      resource={dialogs.feedback.resource}
      itemCount={dialogs.feedback.itemCount}
      error={dialogs.feedback.error}
      onClose={dialogs.closeFeedback}
    />
    </>
  );
}
