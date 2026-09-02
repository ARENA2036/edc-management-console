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
"""Shared test setup.

The application reads ``config/*.yml`` and writes ``logs/`` relative to the
working directory (the container runs with ``WORKDIR /backend``), and importing
``init`` executes that. Anchoring the process here lets a test import the app
regardless of where pytest was invoked from.
"""
import os
from pathlib import Path

os.chdir(Path(__file__).resolve().parent.parent)
