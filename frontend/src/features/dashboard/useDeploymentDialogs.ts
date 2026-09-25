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

import { useState } from 'react';

import { toApiError } from '../../api/errors';

import type { DeploymentFeedback } from './types';
import type { DashboardConnector, ManagedComponent } from '../../types';
import type { ComponentType } from '../deployments/components/component-wizard/ComponentWizard';

interface Input {
  deployConnector: (connector: DashboardConnector) => Promise<boolean>;
  deployComponent: (component: ManagedComponent) => Promise<void>;
}

const idle: DeploymentFeedback = {
  open: false,
  status: 'deploying',
  resource: 'connector',
  itemCount: 1,
};

export function useDeploymentDialogs({ deployConnector, deployComponent }: Input) {
  const [addOpen, setAddOpen] = useState(false);
  const [connectorWizardOpen, setConnectorWizardOpen] = useState(false);
  const [componentWizardOpen, setComponentWizardOpen] = useState(false);
  const [connectorInFlight, setConnectorInFlight] = useState(false);
  const [componentInFlight, setComponentInFlight] = useState(false);
  const [feedback, setFeedback] = useState<DeploymentFeedback>(idle);
  const [componentWizardDefaults, setComponentWizardDefaults] = useState<{
    allowMultipleTypes?: boolean;
    initialSelectedTypes?: ComponentType[];
    startAtConfiguration?: boolean;
  }>({});

  const report = (
    status: DeploymentFeedback['status'],
    resource: DeploymentFeedback['resource'],
    error?: DeploymentFeedback['error'],
  ) => setFeedback({ open: true, status, resource, itemCount: 1, error });

  const openComponentWizard = () => {
    setComponentWizardDefaults({ allowMultipleTypes: true });
    setComponentWizardOpen(true);
  };

  const submitConnector = async (connector: DashboardConnector) => {
    setConnectorInFlight(true);
    report('deploying', 'connector');

    try {
      const deployed = await deployConnector(connector);
      if (deployed) {
        setConnectorWizardOpen(false);
        report('success', 'connector');
      }
    } catch (error) {
      report('error', 'connector', toApiError(error, 'The connector could not be deployed.'));
    } finally {
      setConnectorInFlight(false);
    }
  };

  const submitComponent = async (component: ManagedComponent) => {
    setComponentInFlight(true);
    report('deploying', 'component');

    try {
      await deployComponent(component);
      setComponentWizardOpen(false);
      report('success', 'component');
    } catch (error) {
      report('error', 'component', toApiError(error, 'The component could not be deployed.'));
    } finally {
      setComponentInFlight(false);
    }
  };

  return {
    addOpen,
    setAddOpen,
    connectorWizardOpen,
    setConnectorWizardOpen,
    componentWizardOpen,
    setComponentWizardOpen,
    componentWizardDefaults,
    clearComponentWizardDefaults: () => setComponentWizardDefaults({}),
    openComponentWizard,
    connectorInFlight,
    componentInFlight,
    feedback,
    closeFeedback: () => setFeedback((current) => ({ ...current, open: false })),
    submitConnector,
    submitComponent,
  };
}

export type DeploymentDialogsState = ReturnType<typeof useDeploymentDialogs>;
