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
"""What a caller's roles permit them to do.

Roles are assigned in the identity provider and arrive as claims on the access
token, so this console never stores an authorisation decision of its own.

``Admin`` may deploy, upgrade and delete; ``User`` may only read. A caller
holding neither is treated as a reader, so a missing role mapper degrades to
view-only instead of locking the company out of its own dashboard.

Roles gate *actions* only. Which components an action may touch is
:class:`app.utils.ownership.ComponentScope`, so an Admin still manages nothing
outside their own BPN.
"""

from fastapi import Depends

from app.auth.keycloak_config import keycloak_openid
from app.utils.errors import Forbidden

ADMIN = "Admin"
USER = "User"


def is_admin(user) -> bool:
    """Whether this caller may perform write actions."""
    return ADMIN in ((user or {}).get("roles") or ())


async def require_admin(user=Depends(keycloak_openid.get_current_user)) -> dict:
    """Admit the request only for a caller holding :data:`ADMIN`.

    Used in place of ``get_current_user`` on the write endpoints, so the role
    check is part of the route's declared dependencies rather than a test
    repeated inside each handler.
    """
    if not is_admin(user):
        raise Forbidden(
            "Your account has view-only access to this console.",
            code="ROLE_REQUIRED",
            hint=f"Assign the '{ADMIN}' role for client "
                 f"'{keycloak_openid.client_id or 'this application'}' in the identity provider.",
        )

    return user
