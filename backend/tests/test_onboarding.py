###############################################################
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
###############################################################
import pytest
import requests
import yaml

from app.managers.edc_manager import EdcManager
from app.services import onboarding as module
from app.services.onboarding import onboard

ONBOARDING = {
    "wallet": "cx-1-wallet",
    "identityUrl": "http://cx-1-wallet:15151/api/identity",
    "participantContextId": "cx-1",
    "did": "did:web:cx-1-wallet.example",
    "credentialServiceUrl": "https://cx-1-wallet.example/api/credentials/v1/participants/cx-1",
    "vaultUrl": "http://cx-1-vault:8200",
    "vaultToken": "root",
    "secretAlias": "sts-client-secret",
}


class _Response:
    def __init__(self, status, body=None):
        self.status_code, self._body = status, body or {}
        self.ok = status < 400

    def json(self):
        return self._body


@pytest.fixture
def posts(monkeypatch):
    calls, replies = [], []

    def fake_post(url, json=None, headers=None, timeout=None):
        calls.append((url, json, headers))
        reply = replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(module.requests, "post", fake_post)
    monkeypatch.setattr(module.time, "sleep", lambda seconds: None)
    return calls, replies


def test_creates_the_participant_and_stores_the_sts_secret(posts):
    calls, replies = posts
    replies += [requests.ConnectionError(), _Response(200, {"clientSecret": "s3cret"}), _Response(204)]

    assert onboard(ONBOARDING, "pw") is True

    url, participant, headers = calls[1]
    assert url == "http://cx-1-wallet:15151/api/identity/v1beta/participants"
    assert headers == {"x-api-key": "YWRtaW4.pw"}
    assert participant["did"] == "did:web:cx-1-wallet.example"
    assert participant["participantContextId"] == "cx-1"
    assert calls[2] == ("http://cx-1-vault:8200/v1/secret/data/sts-client-secret",
                        {"data": {"content": "s3cret"}}, {"X-Vault-Token": "root"})


def test_an_existing_participant_counts_as_onboarded(posts):
    calls, replies = posts
    replies.append(_Response(409))

    assert onboard(ONBOARDING, "pw") is True
    assert len(calls) == 1


def test_an_unreachable_wallet_fails_after_the_retries(posts):
    calls, replies = posts
    replies += [requests.ConnectionError()] * 3

    assert onboard(ONBOARDING, "pw", attempts=3, delay=0) is False
    assert len(calls) == 3


def test_the_connector_plan_carries_its_onboarding():
    with open("config/configuration.yml") as file:
        config = yaml.safe_load(file)
    manager = EdcManager(config["connector"], config["dataspaceConfig"], config["components"])
    plan = manager.prepare_deployment("constructxConnector", {
        "name": "cx-1", "version": "0.13.0-021daa74", "db_name": "db",
        "auth": {"db_username": "u", "db_password": "p"}})

    assert plan["onboarding"] == {
        "wallet": "cx-1-wallet",
        "identityUrl": "http://cx-1-wallet:15151/api/identity",
        "participantContextId": "cx-1",
        "did": "did:web:cx-1-wallet.txcd.arena2036-x.de",
        "credentialServiceUrl":
            "https://cx-1-wallet.txcd.arena2036-x.de/api/credentials/v1/participants/cx-1",
        "vaultUrl": "http://cx-1-vault:8200",
        "vaultToken": "root",
        "secretAlias": "sts-client-secret",
    }
    assert manager.prepare_deployment("constructxWallet", {
        "name": "cx-1-wallet", "version": "0.18.0-1", "db_name": "db",
        "auth": {"db_username": "u", "db_password": "p"}})["onboarding"] is None
