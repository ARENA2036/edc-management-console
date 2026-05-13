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

import requests
import logging

logger = logging.getLogger("staging")


def get_oauth2_token(oauth_config: dict) -> str:
    """Fetch OAuth2 access token using client credentials"""

    token_url = oauth_config.get("accessTokenUrl")
    client_id = oauth_config.get("clientId")
    client_secret = oauth_config.get("clientSecret")
    scope = oauth_config.get("scope", "openid")
    client_auth = oauth_config.get("clientAuth", "basic")

    data = {
        "grant_type": "client_credentials",
        "scope": scope
    }

    try:
        if client_auth == "basic":
            response = requests.post(
                token_url,
                data=data,
                auth=(client_id, client_secret),
                timeout=5
            )
        else:
            data["client_id"] = client_id
            data["client_secret"] = client_secret

            response = requests.post(
                token_url,
                data=data,
                timeout=5
            )

        if response.status_code != 200:
            logger.error(f"Token request failed: {response.text}")
            raise Exception("Failed to fetch token")

        json_response = response.json()

        if "access_token" not in json_response:
            logger.error(f"Invalid token response: {json_response}")
            raise Exception("No access_token in response")

        return json_response["access_token"]

    except requests.exceptions.RequestException as e:
        logger.error(f"OAuth request error: {str(e)}")
        raise Exception("OAuth request failed")