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

import { Route, Routes } from 'react-router-dom';

import Dashboard from '../../features/dashboard/Dashboard';
import Monitor from '../../features/monitor/Monitor';
import Settings from '../../features/settings/Settings';


import AppPlaceholder from './AppPlaceholder';
import ExternalAppRedirect from './ExternalAppRedirect';

import type { SessionIdentity } from '../../auth/session';
import type { ExternalApp } from '../externalApps';

interface Props {
  identity: SessionIdentity;
  externalApps: ExternalApp[];
  onOpenGuide: () => void;
}

/** Every route the console serves, in one place. */
export default function AppRoutes({ identity, externalApps, onOpenGuide }: Props) {
  return (
    <Routes>
      <Route path="/" element={<Dashboard identity={identity} />} />
      <Route path="/monitor" element={<Monitor />} />
      {externalApps.map((app) => (
        <Route
          key={app.key}
          path={app.path}
          element={
            app.url ? (
              <ExternalAppRedirect
                url={app.url}
                title={app.redirectTitle}
                description={app.redirectDescription}
              />
            ) : (
              <AppPlaceholder title={app.navLabel} description={app.placeholderDescription} />
            )
          }
        />
      ))}
      <Route
        path="/settings"
        element={<Settings onOpenGuide={onOpenGuide} identity={identity} />}
      />
    </Routes>
  );
}
