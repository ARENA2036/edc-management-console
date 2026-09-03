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
"""The EMC backend application: assembled here, implemented elsewhere.

`create_app` is the composition root. Routes live under `app/api/routers`, the
rules they call under `app/services`, and the objects they need are built once in
`lifespan` and reached through `app/api/dependencies`.
"""
import argparse
import logging

from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.api.dependencies import build_runtime                     # noqa: E402
from app.api.errors import register_exception_handlers             # noqa: E402
from app.api.routers import (components, configuration, dataspace,  # noqa: E402
                             health, submodels)
from app.auth.keycloak_config import keycloak_openid               # noqa: E402
from app.core import config                                        # noqa: E402
from app.core.logging_setup import configure_logging               # noqa: E402

configure_logging()
logger = logging.getLogger(__name__)

ROUTERS = (health.router, components.router, submodels.router,
           dataspace.router, configuration.router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup work, on the server's own event loop.

    It used to run at import time in a throwaway `asyncio.run`, and the
    "initialisation completed" line was logged after `uvicorn.run` returned -
    which is to say, at shutdown.
    """
    identity = config.identity_config()
    keycloak_openid.configure(
        url=identity.get("url"),
        realm=identity.get("realm"),
        client_id=config.client_id(),
        fallback_url=config.centralidp_config().get("url"),
        fallback_realm=config.centralidp_config().get("realm"),
    )

    app.state.runtime = build_runtime()

    # Registering the configured Helm repositories up front is what lets each
    # chart and its subchart dependencies resolve at deploy time. A failure here
    # is not fatal: it only means the first deploy pays for the lookup.
    try:
        await app.state.runtime.edc_service.ensure_repositories()
    except Exception as exception:
        logger.error("[INIT] Failed to register Helm repositories: %s", exception)

    logger.info("[INIT] EMC backend ready.")
    yield


def _add_cors(app: FastAPI) -> None:
    origins = config.allowed_origins()
    if not origins:
        logger.error("[INIT] EMC_ALLOWED_ORIGINS is not set; browser requests from the "
                     "console origin will be refused. Set it to the frontend URL(s).")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )


def create_app() -> FastAPI:
    application = FastAPI(title="EMC Backend", docs_url=None, redoc_url=None,
                          openapi_url=None, lifespan=lifespan)
    keycloak_openid.add_swagger_config(application)
    register_exception_handlers(application)
    _add_cors(application)
    for router in ROUTERS:
        application.include_router(router)

    logger.info("[INIT] EMC Backend assembled with %d routers.", len(ROUTERS))
    return application


app = create_app()


def get_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default=8001, type=int, required=False,
                        help="The server port where it will be available")
    parser.add_argument("--host", default="localhost", type=str, required=False,
                        help="The server host where it will be available")
    parser.add_argument("--debug", default=False, action="store_true", required=False,
                        help="Enable debug logging")
    return parser.parse_args()


def main() -> None:
    print("  _____ __  __  ____   ____             _                  _ ")
    print(" | ____|  \\/  |/ ___| | __ )  __ _  ___| | _____ _ __   __| |")
    print(" |  _| | |\\/| | |     |  _ \\ / _` |/ __| |/ / _ \\ '_ \\ / _` |")
    print(" | |___| |  | | |___  | |_) | (_| | (__|   <  __/ | | | (_| |")
    print(" |_____|_|  |_|\\____| |____/ \\__,_|\\___|_|\\_\\___|_| |_|\\__,_|")
    print("                                                             ")
    print("Application starting, listening to requests...\n")

    args = get_arguments()
    uvicorn.run(app, host=args.host, port=args.port,
                log_level="debug" if args.debug else "info")

    print("\nClosing the application... Thank you for using the EDC Management Console (EMC)!")


if __name__ == "__main__":
    main()
