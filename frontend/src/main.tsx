/********************************************************************************
 * Copyright (c) 2025 ARENA2036 e.V.
 * Copyright (c) 2022,2023 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppNew from './AppNew.tsx'
import keycloak from './auth/keycloak'

const initKeycloak = async () => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
    });

    if (authenticated) {
      localStorage.setItem('token', keycloak.token || '');
      
      keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).then((refreshed) => {
          if (refreshed) {
            localStorage.setItem('token', keycloak.token || '');
          }
        }).catch(() => {
          keycloak.login();
        });
      };

      createRoot(document.getElementById('root')!).render(
        <StrictMode>
          <AppNew />
        </StrictMode>,
      );
    }
  } catch (error) {
    console.error('Failed to initialize Keycloak:', error);
  }
};

initKeycloak();
