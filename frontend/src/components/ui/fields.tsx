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

import { controlClass, READONLY_CONTROL, type FieldAccent } from './fieldStyles';

import type { ChangeEvent, ReactNode } from 'react';


interface FieldShellProps {
  id?: string;
  label: string;
  error?: string;
  help?: ReactNode;
  children: ReactNode;
}

function FieldShell({ id, label, error, help, children }: FieldShellProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300"
      >
        {label}
      </label>
      {children}
      {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
      {!error && help ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{help}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  help?: ReactNode;
  accent?: FieldAccent;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  maxLength,
  disabled,
  readOnly,
  error,
  help,
  accent = 'info',
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} help={help}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        className={readOnly ? READONLY_CONTROL : controlClass(Boolean(error), accent)}
      />
    </FieldShell>
  );
}

interface SelectFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  emptyLabel: string;
  renderOption?: (option: string) => string;
  disabled?: boolean;
  help?: ReactNode;
  accent?: FieldAccent;
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  emptyLabel,
  renderOption,
  disabled,
  help,
  accent = 'info',
}: SelectFieldProps) {
  const isEmpty = options.length === 0;

  return (
    <FieldShell id={id} label={label} help={help}>
      <select
        id={id}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        disabled={disabled || isEmpty}
        className={`${controlClass(false, accent)} disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-800`}
      >
        {isEmpty ? (
          <option value="">{emptyLabel}</option>
        ) : (
          options.map((option) => (
            <option key={option} value={option}>
              {renderOption ? renderOption(option) : option}
            </option>
          ))
        )}
      </select>
    </FieldShell>
  );
}
