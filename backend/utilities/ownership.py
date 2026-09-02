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
"""

from dataclasses import dataclass
from typing import Optional

from utilities.errors import EmcError, Stage


def normalize_bpn(value) -> str:
    """Canonical BPN: trimmed and upper-cased, ``""`` when absent."""
    return value.strip().upper() if isinstance(value, str) else ""


@dataclass(frozen=True)
class ComponentScope:
    """The set of components one caller may act on.

    ``bpn`` is either a canonical BPN or ``None``, meaning unscoped: every
    component, including those with no recorded owner. The empty string is
    rejected in favour of ``None`` on construction, so "owner unknown" can
    never silently become "owns the unowned rows" - which is what makes the
    ``bpn is None`` test at the persistence boundary safe to read as
    "no filter".
    """

    bpn: Optional[str] = None

    def __post_init__(self):
        object.__setattr__(self, "bpn", normalize_bpn(self.bpn) or None)

    @property
    def is_unscoped(self) -> bool:
        return self.bpn is None

    def permits(self, record) -> bool:
        """Whether ``record`` is in this scope, for rows already in hand."""
        return self.is_unscoped or normalize_bpn(getattr(record, "bpn", "")) == self.bpn

    @classmethod
    def for_user(cls, user: Optional[dict], enforce: bool) -> "ComponentScope":
        """The scope of a caller, from their verified claims.

        A caller whose token carries a BPN is scoped to it. One without a BPN
        has no dataspace identity, and ``enforce`` (from
        ``identity.enforceSessionBpn``) decides what that means: refuse the
        request, or treat them as unscoped so API-key-only clients and the
        frontend's auth-disabled development mode keep working.

        Isolation does not depend on ``enforce``: as soon as a token carries a
        BPN, that caller is scoped to it either way.
        """
        bpn = normalize_bpn((user or {}).get("bpn"))
        if bpn:
            return cls(bpn)

        if enforce:
            raise EmcError(
                "Your login does not provide a BPN, so this console cannot tell which "
                "company's components you may access.",
                status=403, code="SESSION_BPN_MISSING", stage=Stage.AUTH,
                hint="Add a 'bpn' claim mapper for this client in the identity provider, "
                     "or set identity.enforceSessionBpn: false.",
            )
        return cls(None)
