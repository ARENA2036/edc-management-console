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
"""Which components a caller may see and manage.

A component belongs to the BPN that deployed it. Only a caller acting for that
BPN may list it, health-check it, upgrade it or delete it - and an unauthorised
lookup is answered "not found" rather than "forbidden", so the API never
confirms that another company's component exists.

This decides what a caller may *see*; :mod:`app.auth.roles` decides what they may
*do*. The two are independent, so an Admin still only manages the components of
the company they act for.
"""

from dataclasses import dataclass
from typing import Optional

from app.utils.errors import Forbidden


def normalize_bpn(value) -> str:
    """Canonical BPN: trimmed and upper-cased, ``""`` when absent."""
    return value.strip().upper() if isinstance(value, str) else ""


@dataclass(frozen=True)
class ComponentScope:
    """The set of components one caller may act on.

    ``bpn`` is the canonical BPN the caller acts for. The default of ``None``
    matches no record at all, so a scope built without an owner denies rather
    than grants - "owner unknown" can never silently become "owns everything".
    """

    bpn: Optional[str] = None

    def __post_init__(self):
        object.__setattr__(self, "bpn", normalize_bpn(self.bpn) or None)

    def permits(self, record) -> bool:
        """Whether ``record`` is in this scope, for rows already in hand."""
        return self.bpn is not None and normalize_bpn(getattr(record, "bpn", "")) == self.bpn

    @classmethod
    def for_user(cls, user: Optional[dict]) -> "ComponentScope":
        """The scope of a caller, from their verified claims.

        Every account in the dataspace acts for exactly one company, so a token
        carrying no BPN has no company to be scoped to and the request is
        refused rather than widened.
        """
        bpn = normalize_bpn((user or {}).get("bpn"))
        if not bpn:
            raise Forbidden(
                "Your login does not provide a BPN, so this console cannot tell which "
                "company's components you may access.",
                code="SESSION_BPN_MISSING",
                hint="Add a 'bpn' claim mapper for this client in the identity provider.",
            )

        return cls(bpn)
