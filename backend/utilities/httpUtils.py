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
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Any, Dict, Optional
import io


class HttpUtils:
    @staticmethod
    def response(data: Any = None, status: int = 200, message: Optional[str] = None):
        response_data = {}
        if message:
            response_data["message"] = message
        if data is not None:
            response_data["data"] = data
        return JSONResponse(content=response_data, status_code=status)

    @staticmethod
    def get_error_response(status: int, message: str):
        return JSONResponse(
            content={"error": message, "status": status},
            status_code=status
        )

    @staticmethod
    def get_not_authorized():
        return HttpUtils.get_error_response(
            status=401,
            message="Not authorized. Please provide valid authentication."
        )

    @staticmethod
    def proxy(response: Any):
        if hasattr(response, 'json'):
            return JSONResponse(content=response.json(), status_code=response.status_code)
        return response

    @staticmethod
    def file_response(buffer: io.BytesIO, filename: str, content_type: str):
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
