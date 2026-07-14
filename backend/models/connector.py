import base64
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

## Define here the search parameters or filters 
class DigitalTwinRegistry(BaseModel):
    url: str
    credentials: str

class SubModelServer(BaseModel):
    url: str
    credentials: str

class Connector(BaseModel):
    # Accept arbitrary extra fields so new dataspace components can be gated /
    # mapped from configuration (e.g. a component's `deployWhen: <field>.url`)
    # without adding a model field for each one.
    model_config = ConfigDict(extra="allow")

    name: str
    bpn: str
    version: str
    # Optional: the connector itself is only deployed when an endpoint url is
    # given (components.connector.deployWhen: url). Absent/empty -> connector skipped.
    url: Optional[str] = None
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
    submodel: Optional[SubModelServer] = None


class ComponentRequest(BaseModel):
    """A single component to deploy. `type` selects the config under
    `components.<type>`; every other field (name, version, url, bpn, auth, ...)
    is the deployment source and is read by that component's value mappings.
    Extra fields are allowed so the payload can carry anything the mappings need.
    """
    model_config = ConfigDict(extra="allow")

    type: str
    name: Optional[str] = None


class DeploymentRequest(BaseModel):
    """The deploy payload: a list of components. A component is deployed when it
    is present with data; an empty/typeless/nameless entry is skipped (optional).
    """
    model_config = ConfigDict(extra="allow")

    components: List[ComponentRequest] = []