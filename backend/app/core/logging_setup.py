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
"""Logging configuration, applied before the application starts serving."""
import logging
import logging.config

import yaml

from app.core.config import CONFIG_DIR
from app.utils.operators import op


def configure_logging() -> None:
    op.make_dir("logs")
    with open(CONFIG_DIR / "logging.yml", "rt", encoding="utf-8") as handle:
        log_config = yaml.safe_load(handle.read())

    date = op.get_filedate()
    op.make_dir(f"logs/{date}")
    log_config["handlers"]["file"]["filename"] = (
        f"logs/{date}/{op.get_filedatetime()}-emc.log")
    logging.config.dictConfig(log_config)
    logging.captureWarnings(True)
