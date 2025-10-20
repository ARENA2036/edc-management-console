from pydantic import BaseModel, Field
from typing import Optional, Dict, List


class ConnectorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1)
    bpn: Optional[str] = None
    config: Optional[Dict] = None


class ConnectorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[str] = Field(None, min_length=1)
    bpn: Optional[str] = None
    config: Optional[Dict] = None
    status: Optional[str] = None


class ConnectorResponse(BaseModel):
    id: int
    name: str
    url: str
    bpn: Optional[str]
    status: str
    config: Optional[Dict]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


class EdcRequest(BaseModel):
    bpn: str
    url: str
    dct_type: Optional[str] = None
    path: str
    policies: Optional[List[str]] = []
    headers: Optional[Dict] = {}


class EdcPostRequest(EdcRequest):
    body: Optional[Dict] = {}
    content_type: Optional[str] = "application/json"


class Search(BaseModel):
    bpn: str


class SearchProof(BaseModel):
    bpn: str
    id: str
