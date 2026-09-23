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

import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function SidebarGroup({ icon: Icon, label, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-900"
      >
        <span className="flex items-center gap-3">
          <Icon size={20} />
          <span>{label}</span>
        </span>
        <ChevronRight size={16} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="mt-1 space-y-1 pl-3">{children}</div>}
    </div>
  );
}
