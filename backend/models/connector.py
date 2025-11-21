import base64
from typing import List, Optional

from pydantic import BaseModel

## Define here the search parameters or filters 
class DigitalTwinRegistry(BaseModel):
    url: str
    credentials: str

class Connector(BaseModel):
    name: str
    bpn: str
    version: str
    url: str
    iatp_id: Optional[str] = None
    trustedIssuers: Optional[str] = None
    sts_dim_url: Optional[str] = None
    sts_oauth_tokenUrl: Optional[str] = None
    sts_oauth_client_id: Optional[str] = None
    sts_oauth_secretAlias: Optional[str] = None
    cp_bdrs_server_url: Optional[str] = None
    cp_hostname: Optional[str] = None
    dp_hostname: Optional[str] = None
    db_name: Optional[str] = "edc"
    db_username: Optional[str] = "user"
    db_password: Optional[str] = ""
    registry: Optional[DigitalTwinRegistry] = None
