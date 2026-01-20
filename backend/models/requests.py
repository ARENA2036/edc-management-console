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
from pydantic import BaseModel, Field
from typing import Optional, Dict, List


class ConnectorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1)
    bpn: Optional[str] = None
    config: Optional[Dict] = None


class ConnectorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[str] = Field(None, min_length=1)
    bpn: Optional[str] = None
    config: Optional[Dict] = None
    status: Optional[str] = None


class ConnectorResponse(BaseModel):
    id: int
    name: str
    url: str
    bpn: Optional[str]
    status: str
    config: Optional[Dict]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


class EdcRequest(BaseModel):
    bpn: str
    url: str
    dct_type: Optional[str] = None
    path: str
    policies: Optional[List[str]] = []
    headers: Optional[Dict] = {}


class EdcPostRequest(EdcRequest):
    body: Optional[Dict] = {}
    content_type: Optional[str] = "application/json"


class Search(BaseModel):
    bpn: str


class SearchProof(BaseModel):
    bpn: str
    id: str
