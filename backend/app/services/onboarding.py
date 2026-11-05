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
"""Onboarding of Construct-X connectors onto their wallets and the test issuer."""
import logging
import time
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# The wallet superuser is "admin"; its API key is base64("admin") + "." + secret.
WALLET_API_KEY_PREFIX = "YWRtaW4."
ATTEMPTS, DELAY = 40, 15


def _post(url: str, payload: dict, headers: dict, attempts: int, delay: float) -> Optional[requests.Response]:
    """POST until the service answers (it may still be starting); None if it never does."""
    for attempt in range(attempts):
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code < 500:
                return response
        except requests.RequestException:
            pass
        if attempt < attempts - 1:
            time.sleep(delay)
    return None


def _done(response: Optional[requests.Response], what: str) -> bool:
    """True when the call succeeded or the resource already exists (409)."""
    if response is not None and (response.ok or response.status_code == 409):
        return True
    logger.error("[Onboarding] %s failed: %s", what,
                 "unreachable" if response is None else f"HTTP {response.status_code}")
    return False


def _create_participant(onboarding: dict, api_key: str, endpoints: list,
                        attempts: int, delay: float) -> Optional[requests.Response]:
    did = onboarding["did"]
    participant = {
        "participantContextId": onboarding["participantContextId"],
        "did": did,
        "active": True,
        "roles": [],
        "serviceEndpoints": endpoints,
        "key": {"keyId": f"{did}#key-1", "privateKeyAlias": f"{did}-alias",
                "keyGeneratorParams": {"algorithm": "EdDSA", "curve": "Ed25519"}},
    }
    return _post(onboarding["identityUrl"].rstrip("/") + "/v1beta/participants", participant,
                 {"x-api-key": api_key}, attempts, delay)


def onboard(onboarding: dict, wallet_secret: str, issuer_secret: Optional[str] = None,
            attempts: int = ATTEMPTS, delay: float = DELAY) -> bool:
    """Create the connector's participant in its wallet, store the STS client
    secret in the connector's vault and, when an issuer is deployed, register the
    connector as holder there and request its membership credential."""
    did, context = onboarding["did"], onboarding["participantContextId"]
    wallet_key = {"x-api-key": WALLET_API_KEY_PREFIX + wallet_secret}
    created = _create_participant(onboarding, wallet_key["x-api-key"], [
        {"id": "credential-service", "type": "CredentialService",
         "serviceEndpoint": onboarding["credentialServiceUrl"]}], attempts, delay)
    if not _done(created, f"Creating participant {did}"):
        return False
    if created.status_code != 409:
        secret_url = f'{onboarding["vaultUrl"].rstrip("/")}/v1/secret/data/{onboarding["secretAlias"]}'
        stored = _post(secret_url, {"data": {"content": created.json()["clientSecret"]}},
                       {"X-Vault-Token": onboarding["vaultToken"]}, attempts, delay)
        if not _done(stored, f"Storing the STS secret of {did}"):
            return False

    if issuer_secret is None:
        logger.warning("[Onboarding] No issuer deployed; %s gets no membership credential", did)
        return True
    issuer_admin = (f'{onboarding["issuerAdminUrl"].rstrip("/")}/v1beta/participants/'
                    f'{onboarding["issuerContextId"]}')
    holder = _post(f"{issuer_admin}/holders", {"holderId": did, "did": did, "name": context},
                   {"x-api-key": WALLET_API_KEY_PREFIX + issuer_secret}, attempts, delay)
    if not _done(holder, f"Registering holder {did}"):
        return False
    requested = _post(
        f'{onboarding["identityUrl"].rstrip("/")}/v1beta/participants/{context}/credentials/request',
        {"issuerDid": onboarding["issuerDid"],
         "credentials": [{"format": onboarding["credentialFormat"],
                          "type": onboarding["credentialType"],
                          "id": onboarding["credentialDefinitionId"]}]},
        wallet_key, attempts, delay)
    if not _done(requested, f"Requesting the membership credential of {did}"):
        return False
    logger.info("[Onboarding] %s onboarded", did)
    return True


def bootstrap_issuer(onboarding: dict, secret: str, attempts: int = ATTEMPTS,
                     delay: float = DELAY) -> bool:
    """Create the issuer's participant and the membership credential it issues."""
    api_key = WALLET_API_KEY_PREFIX + secret
    created = _create_participant(onboarding, api_key, [
        {"id": "issuer-service", "type": "IssuerService",
         "serviceEndpoint": onboarding["issuanceServiceUrl"]}], attempts, delay)
    if not _done(created, f'Creating issuer {onboarding["did"]}'):
        return False
    admin = (f'{onboarding["adminUrl"].rstrip("/")}/v1beta/participants/'
             f'{onboarding["participantContextId"]}')
    headers = {"x-api-key": api_key}
    attestation = _post(f"{admin}/attestations", {
        "id": onboarding["attestationId"], "attestationType": "dev",
        "configuration": {"default": {"isMember": True}, "blackList": []}},
        headers, attempts, delay)
    if not _done(attestation, "Creating the membership attestation"):
        return False
    definition = _post(f"{admin}/credentialdefinitions", {
        "id": onboarding["credentialDefinitionId"],
        "credentialType": onboarding["credentialType"],
        "format": onboarding["credentialFormat"],
        "attestations": [onboarding["attestationId"]],
        "jsonSchema": "{}",
        "jsonSchemaUrl": "https://example.com/schema/membership.json",
        "mappings": [{"input": "content", "output": "credentialSubject", "required": True}],
        "rules": [],
        "validity": 15552000}, headers, attempts, delay)
    if not _done(definition, "Creating the membership credential definition"):
        return False
    logger.info("[Onboarding] Issuer %s ready", onboarding["did"])
    return True
