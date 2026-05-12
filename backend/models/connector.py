###############################################################
# Tractus-X - EDC Management Console
#
# Copyright (c) 2025 ARENA2036 e.V.
# Copyright (c) 2025 Contributors to the Eclipse Foundation
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
###############################################################
import base64
from typing import List, Optional

from pydantic import BaseModel

## Define here the search parameters or filters 
class DigitalTwinRegistry(BaseModel):
    url: str
    credentials: str

class SubModelServer(BaseModel):
    url: str
    credentials: str

class Connector(BaseModel):
    name: str
    bpn: str
    version: str
    url: str
    iatp_id: Optional[str] = None
    trustedIssuers: Optional[str] = None
    sts_dim_url: Optional[str] = None
    sts_oauth_tokenUrl: Optional[str] = None
    sts_oauth_client_id: Optional[str] = None
    sts_oauth_secretAlias: Optional[str] = None
    cp_bdrs_server_url: Optional[str] = None
    cp_hostname: Optional[str] = None
    dp_hostname: Optional[str] = None
    db_name: Optional[str] = "edc"
    db_username: Optional[str] = "user"
    db_password: Optional[str] = ""
    registry: Optional[DigitalTwinRegistry] = None
    submodel: Optional[SubModelServer] = None