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

import type { ButtonHTMLAttributes } from 'react';

export type ButtonTone = 'brand' | 'info' | 'ghost' | 'outline' | 'danger';

const TONE_CLASSES: Record<ButtonTone, string> = {
  brand:
    'rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400',
  info:
    'rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400',
  ghost:
    'rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-slate-300 dark:hover:bg-slate-800',
  outline:
    'rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
}

export default function Button({ tone = 'brand', type = 'button', className, ...rest }: Props) {
  return <button type={type} className={`${TONE_CLASSES[tone]} ${className ?? ''}`} {...rest} />;
}
