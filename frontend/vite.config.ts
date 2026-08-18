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
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
function clearCookiesPlugin(): Plugin {
  return {
    name: 'clear-cookies',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cookies = req.headers.cookie
        if (cookies) {
          const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0])
          cookieNames.forEach(name => {
            res.appendHeader('Set-Cookie', `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`)
          })
        }
        next()
      })
    },
  }
}
export default defineConfig({
  plugins: [react(), clearCookiesPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5001,
    strictPort: true,
    allowedHosts: ['trg9.localhost'],
  }
})
