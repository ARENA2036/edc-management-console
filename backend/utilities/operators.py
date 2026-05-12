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
import os
from datetime import datetime


class Operators:
    @staticmethod
    def make_dir(path: str):
        if not os.path.exists(path):
            os.makedirs(path)

    @staticmethod
    def get_filedate() -> str:
        return datetime.now().strftime("%Y-%m-%d")

    @staticmethod
    def get_filedatetime() -> str:
        return datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    @staticmethod
    def timestamp() -> str:
        return datetime.now().isoformat()


op = Operators()
