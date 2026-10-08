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


import { useI18n } from '../../i18n';

import Button from './Button';
import Modal from './Modal';

import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDialog({
  open,
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
}: Props) {
  const { t } = useI18n();

  return (
    <Modal
      open={open}
      title={title}
      titleTone="danger"
      widthClass="max-w-md"
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-3">
          <Button tone="outline" onClick={onCancel}>
            {cancelLabel ?? t('cancel')}
          </Button>
          <Button tone="danger" onClick={onConfirm}>
            {confirmLabel ?? t('confirmDelete')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
        {children}
      </div>
    </Modal>
  );
}
