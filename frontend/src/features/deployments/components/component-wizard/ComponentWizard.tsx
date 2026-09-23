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

import ComponentConfigStep from './ComponentConfigStep';
import ComponentTypeStep from './ComponentTypeStep';
import { useComponentWizard } from './useComponentWizard';

import type { ComponentType } from './componentTypes';
import type { ManagedComponent } from '../../../../types';

export type { ComponentType } from './componentTypes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (component: ManagedComponent) => Promise<void> | void;
  deploying?: boolean;
  existingNames: string[];
  defaultVersions?: Partial<Record<ManagedComponent['type'] | 'connector', string>>;
  availableVersions?: Partial<Record<ManagedComponent['type'] | 'connector', string[]>>;
  allowMultipleTypes?: boolean;
  initialSelectedTypes?: ComponentType[];
  startAtConfiguration?: boolean;
  typeCounts: Record<ManagedComponent['type'], number>;
  typeLimits: Record<ManagedComponent['type'], number>;
}

export default function ComponentWizard({
  open,
  onOpenChange,
  onDeploy,
  deploying = false,
  existingNames,
  defaultVersions,
  availableVersions,
  allowMultipleTypes = true,
  initialSelectedTypes,
  startAtConfiguration = false,
  typeCounts,
  typeLimits,
}: Props) {
  const { t } = useI18n();
  const close = () => onOpenChange(false);
  const wizard = useComponentWizard({
    open,
    deploying,
    existingNames,
    defaultVersions,
    availableVersions,
    allowMultipleTypes,
    initialSelectedTypes,
    startAtConfiguration,
    typeCounts,
    typeLimits,
    onDeploy,
    onClose: close,
  });

  const primaryLabel = deploying
    ? t('deploymentStatusDeployingTitle')
    : wizard.step === 1
    ? t('next')
    : t('deployNow');

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('addComponent')}
      description={wizard.step === 1 ? t('componentTypeStep') : t('componentConfigStep')}
      widthClass="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <Button tone="ghost" onClick={wizard.back} disabled={deploying}>
            {wizard.step === 1 ? t('cancel') : t('back')}
          </Button>
          <Button
            tone="info"
            onClick={() => void wizard.submit()}
            disabled={deploying || wizard.allTypesFull}
          >
            {primaryLabel}
          </Button>
        </div>
      }
    >
      {wizard.step === 1 ? (
        <ComponentTypeStep wizard={wizard} />
      ) : (
        <ComponentConfigStep wizard={wizard} deploying={deploying} />
      )}
    </Modal>
  );
}
