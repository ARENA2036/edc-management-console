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

import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import { useI18n } from '../../../../i18n';

import ConnectorForm from './ConnectorForm';
import { useConnectorDraft } from './useConnectorDraft';

import type { DashboardConnector } from '../../../../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (connector: DashboardConnector) => Promise<void> | void;
  connectorCount: number;
  deploying?: boolean;
  existingConnectorNames: string[];
  defaultVersion?: string;
  availableVersions?: string[];
  prefilledBpn?: string;
  bpnRequired?: boolean;
  defaultApiEndpoint?: string;
  defaultDataPlaneUrl?: string;
  controlPlaneHostSuffix?: string;
  dataPlaneHostSuffix?: string;
}

export default function DeploymentWizard({
  open,
  onOpenChange,
  onDeploy,
  connectorCount,
  deploying = false,
  existingConnectorNames,
  defaultVersion,
  availableVersions,
  prefilledBpn,
  bpnRequired = true,
  defaultApiEndpoint,
  defaultDataPlaneUrl,
  controlPlaneHostSuffix,
  dataPlaneHostSuffix,
}: Props) {
  const { t } = useI18n();
  const draft = useConnectorDraft({
    open,
    deploying,
    connectorCount,
    existingConnectorNames,
    defaultVersion,
    availableVersions,
    prefilledBpn,
    bpnRequired,
    defaultApiEndpoint,
    defaultDataPlaneUrl,
    controlPlaneHostSuffix,
    dataPlaneHostSuffix,
    onDeploy,
    onClose: () => onOpenChange(false),
  });

  return (
    <Modal
      open={open}
      onClose={draft.close}
      title={t('deployConnector')}
      description={t('connectorNameStep')}
      footer={
        <div className="flex items-center justify-between">
          <Button tone="ghost" onClick={draft.close} disabled={deploying}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => void draft.submit()}
            disabled={deploying || draft.limitReached || draft.blockedByMissingBpn}
          >
            {deploying ? t('deploymentStatusDeployingTitle') : t('deployNow')}
          </Button>
        </div>
      }
    >
      <ConnectorForm draft={draft} deploying={deploying} bpnRequired={bpnRequired} />
    </Modal>
  );
}
