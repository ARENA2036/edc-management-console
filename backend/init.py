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
import argparse
import logging.config
import yaml
import urllib3
import uvicorn
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from auth.keycloak_config import keycloak_openid

from routes.health import router as health_router
from routes.connectors import router as connectors_router
from routes.submodel import router as submodel_router
from routes.config import router as config_router


from tractusx_sdk.dataspace.managers import AuthManager
from tractusx_sdk.dataspace.managers import OAuth2Manager
from managers.edcManager import EdcManager
from managers.databaseManager import DatabaseManager
from service.edcService import EdcService
from utilities.operators import op

op.make_dir("logs")

idpManager: OAuth2Manager
authManager: AuthManager
edcManager: EdcManager
edcService: EdcService
databaseManager: DatabaseManager

urllib3.disable_warnings()
logging.captureWarnings(True)
logger = logging.getLogger(__name__)
# ------------------------------------------------------------
# Logging Setup
# ------------------------------------------------------------
#logging.basicConfig(level=logging.INFO)
#logger = logging.getLogger("CX-EMC")

with open('./config/logging.yml', 'rt') as f:
    # Read the yaml configuration
    log_config = yaml.safe_load(f.read())
    # Set logging filename with datetime
    date = op.get_filedate()
    op.make_dir("logs/" + date)
    log_config["handlers"]["file"]["filename"] = f'logs/{date}/{op.get_filedatetime()}-emc.log'
    logging.config.dictConfig(log_config)

logger = logging.getLogger(__name__)

# Load the configuration for the application
with open('./config/configuration.yml', 'rt') as f:
    # Read the yaml configuration
    app_configuration = yaml.safe_load(f.read())

# ------------------------------------------------------------
# Load Config
# ------------------------------------------------------------
with open("config/settings.yaml", "r") as f:
    settings = yaml.safe_load(f)

# ------------------------------------------------------------
# FastAPI Setup
# ------------------------------------------------------------
app = FastAPI(title="EMC Backend")
app.include_router(health_router)
app.include_router(connectors_router)
app.include_router(submodel_router)
app.include_router(config_router)
app.add_middleware(
        CORSMiddleware,
        allow_origins=['http://localhost:5001/', 'http://localhost:5000/', 'https://emc.prod.arena2036-x.de/', 'https://emc.staging.arena2036-x.de/'],
        allow_methods=['*'],
        allow_headers=['*']
    )

keycloak_openid.add_swagger_config(app)
logger.info("[INIT] Starting EMC Backend...")

# ------------------------------------------------------------
# Initialize Managers
# ------------------------------------------------------------

# init_db()
# init_edc(settings)
# init_activity()
    
logger.info("[INIT] All managers initialized successfully!")


def init_app(host: str, port: int, log_level: str = "info"):
    global app, app_configuration, edcService, edcManager, edcDiscoveryService, discoveryFinderService, authManager, databaseManager

    ## API Key Authorization
    authManager = AuthManager()
    auth_config: dict = app_configuration.get("authorization", {"enabled": False})
    auth_enabled: bool = auth_config.get("enabled", False)

    if auth_enabled:
        api_key: dict = auth_config.get("apiKey", {"key": "X-Api-Key", "value": "password"})
        authManager = AuthManager(api_key_header=api_key.get("key", "X-Api-Key"),
                                configured_api_key=api_key.get("value", "password"), auth_enabled=True)

    edcService = EdcService(helm_chart_directory=app_configuration.get("edc",{}).get("helm_chart_directory", None))

    ## Get environment specific configurations
    cluster_config: dict = app_configuration["clusterConfig"]
    file_config: dict = app_configuration["files"]
    edc_config: dict = app_configuration.get("edc", {})
    logger.info(edc_config)
    edcManager = EdcManager(
        cluster_config=cluster_config,
        edc_config=edc_config,
        dataspace_config=app_configuration.get("dataspaceConfig",{}),
        files_config=file_config
    )

    ## Initialize database manager
    databaseManager = DatabaseManager(database_url="sqlite:///edc_manager.db")

    uvicorn.run(app, host=host, port=port, log_level=log_level)

    logger.info("[INIT] Application Startup Initialization Completed!")
    logger.info("✅ EMC backend configured and ready on port 8001.")



def get_arguments():
    """
    Commandline argument handling. Return the populated namespace.

    Returns:
        args: :func:`parser.parse_args`
    """

    parser = argparse.ArgumentParser()

    parser.add_argument("--port", default=8001,
                        help="The server port where it will be available", required=False, type=int)

    parser.add_argument("--host", default="localhost",
                        help="The server host where it will be available", required=False, type=str)

    parser.add_argument("--debug", default=False, action="store_false", \
                        help="Enable and disable the debug", required=False)

    args = parser.parse_args()
    return args


if __name__ == "__main__":

    print("  _____ __  __  ____   ____             _                  _ ")
    print(" | ____|  \\/  |/ ___| | __ )  __ _  ___| | _____ _ __   __| |")
    print(" |  _| | |\\/| | |     |  _ \\ / _` |/ __| |/ / _ \\ '_ \\ / _` |")
    print(" | |___| |  | | |___  | |_) | (_| | (__|   <  __/ | | | (_| |")
    print(" |_____|_|  |_|\\____| |____/ \\__,_|\\___|_|\\_\\___|_| |_|\\__,_|")
    print("                                                             ")

    print("Application starting, listening to requests...\n")

    # Initialize the server environment and get the comand line arguments
    args = get_arguments()
    # Configure the logging confiuration depending on the configuration stated
    logger = logging.getLogger('staging')
    if args.debug:
        logger = logging.getLogger('development')

    # Init application
    init_app(host=args.host, port=args.port, log_level=("debug" if args.debug else "info"))

    print("\nClosing the application... Thank you for using the EDC Management Console (EMC)!")
