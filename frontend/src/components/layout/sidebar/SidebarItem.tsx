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

import { Link } from 'react-router-dom';

import Tooltip from '../../ui/Tooltip';

import type { NavItem } from './navigation';

const PRIMARY_CLASS = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors';
const NESTED_CLASS =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors';

const PRIMARY_STATE = {
  active: 'bg-orange-50 font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-300',
  idle: 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-900',
};

const NESTED_STATE = {
  active: 'bg-orange-50 font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-300',
  idle:
    'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200',
};

interface Props {
  item: NavItem;
  nested?: boolean;
  active?: boolean;
  onNavigate: () => void;
}

export default function SidebarItem({ item, nested = false, active = false, onNavigate }: Props) {
  const Icon = item.icon;
  const iconSize = nested ? 16 : 20;
  const className = `${nested ? NESTED_CLASS : PRIMARY_CLASS} ${
    (nested ? NESTED_STATE : PRIMARY_STATE)[active ? 'active' : 'idle']
  }`;
  const body = (
    <>
      <Icon size={iconSize} />
      <span>{item.label}</span>
    </>
  );

  const control = item.to ? (
    <Link to={item.to} onClick={onNavigate} className={className}>
      {body}
    </Link>
  ) : item.href ? (
    <a
      href={item.href}
      target={item.href.startsWith('http') ? '_blank' : undefined}
      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
      className={className}
    >
      {body}
    </a>
  ) : (
    <button type="button" onClick={item.onSelect} className={className}>
      {body}
    </button>
  );

  return (
    <Tooltip
      title={item.tooltip.title}
      content={item.tooltip.content}
      footer={item.tooltip.footer}
      position="right"
      fullWidth
    >
      {control}
    </Tooltip>
  );
}
