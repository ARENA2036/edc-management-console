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

import { X } from 'lucide-react';


import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useI18n } from '../../i18n';

import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  widthClass?: string;
  titleTone?: 'default' | 'danger';
  children: ReactNode;
}

export default function Modal({
  open,
  title,
  description,
  onClose,
  footer,
  widthClass = 'max-w-2xl',
  titleTone = 'default',
  children,
}: Props) {
  const { t } = useI18n();
  useLockBodyScroll(open);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/50 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`flex max-h-[calc(100vh-3rem)] w-full ${widthClass} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
            <div>
              <h2
                className={`text-2xl font-semibold ${
                  titleTone === 'danger' ? 'text-red-600' : 'text-gray-900 dark:text-slate-100'
                }`}
              >
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={t('close')}
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto overscroll-contain px-6 py-6">{children}</div>

          {footer ? (
            <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-800">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
