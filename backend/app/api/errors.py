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
"""The application's error responses, in one place.

Handlers raise; nothing catches. These three cover every way a request can fail,
so a route does not repeat the envelope or guess at a stage.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError

from app.utils.errors import EmcError, Stage, new_error_id
from app.utils.http_utils import HttpUtils

logger = logging.getLogger(__name__)


async def handle_emc_error(request: Request, exc: EmcError):
    """A failure raised deliberately - it already carries its own status."""
    return HttpUtils.error_response(exc, stage=exc.stage, log=logger)


async def handle_validation_error(request: Request, exc: RequestValidationError):
    """422 naming the offending fields.

    FastAPI already answers 422; what it does not do is use this envelope or
    report the fields in a form a client can show without understanding
    pydantic's error format.
    """
    fields = [
        "{}: {}".format(
            ".".join(str(part) for part in item.get("loc", ()) if part != "body") or "body",
            item.get("msg", "invalid value"),
        )
        for item in exc.errors()
    ]
    error_id = new_error_id()
    logger.warning("[VALIDATION_FAILED][stage=%s][id=%s] %s",
                   Stage.REQUEST, error_id, "; ".join(fields))
    return HttpUtils.get_error_response(
        status=422,
        message="The request payload is not valid.",
        code="VALIDATION_FAILED",
        stage=Stage.REQUEST,
        detail="\n".join(fields),
        hint="Correct the listed fields and send the request again.",
        error_id=error_id,
    )


async def handle_unexpected_error(request: Request, exc: Exception):
    """Last resort. Anything here is a bug: logged with a traceback and reported
    as 500, never downgraded to a 4xx that would look like the caller's fault."""
    return HttpUtils.error_response(exc, stage=Stage.INTERNAL, log=logger)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(EmcError, handle_emc_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
