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

import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  iconClass: string;
  title: string;
  description: string;
  /** Sections reserve different amounts of room when they are empty. */
  minHeightClass?: string;
}

export default function EmptyState({
  icon,
  iconClass,
  title,
  description,
  minHeightClass = 'min-h-[220px]',
}: Props) {
  return (
    <div
      className={`flex ${minHeightClass} flex-col items-center justify-center px-6 py-10 text-center`}
    >
      <div
        className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${iconClass}`}
      >
        {icon}
      </div>
      <h4 className="text-xl font-semibold text-gray-700 dark:text-slate-200">{title}</h4>
      <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
