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
"""Onboarding of a Construct-X connector onto its own wallet."""
import logging
import time
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# The wallet superuser is "admin"; its API key is base64("admin") + "." + secret.
WALLET_API_KEY_PREFIX = "YWRtaW4."


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


def onboard(onboarding: dict, wallet_secret: str, attempts: int = 40, delay: float = 15) -> bool:
    """Create the connector's participant in its wallet and store the returned
    STS client secret in the connector's vault."""
    did = onboarding["did"]
    participant = {
        "participantContextId": onboarding["participantContextId"],
        "did": did,
        "active": True,
        "roles": [],
        "serviceEndpoints": [{"id": "credential-service", "type": "CredentialService",
                              "serviceEndpoint": onboarding["credentialServiceUrl"]}],
        "key": {"keyId": f"{did}#key-1", "privateKeyAlias": f"{did}-alias",
                "keyGeneratorParams": {"algorithm": "EdDSA", "curve": "Ed25519"}},
    }
    response = _post(onboarding["identityUrl"].rstrip("/") + "/v1beta/participants", participant,
                     {"x-api-key": WALLET_API_KEY_PREFIX + wallet_secret}, attempts, delay)
    if response is not None and response.status_code == 409:
        logger.info("[Onboarding] %s is already a participant of its wallet", did)
        return True
    if response is None or not response.ok:
        logger.error("[Onboarding] Creating participant %s failed: %s", did,
                     "wallet unreachable" if response is None else f"HTTP {response.status_code}")
        return False

    secret_url = f'{onboarding["vaultUrl"].rstrip("/")}/v1/secret/data/{onboarding["secretAlias"]}'
    stored = _post(secret_url, {"data": {"content": response.json()["clientSecret"]}},
                   {"X-Vault-Token": onboarding["vaultToken"]}, attempts, delay)
    if stored is None or not stored.ok:
        logger.error("[Onboarding] Storing the STS secret of %s failed", did)
        return False
    logger.info("[Onboarding] %s onboarded onto its wallet", did)
    return True
