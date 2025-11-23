from datetime import datetime

from sqlalchemy import Uuid, Column, String, Integer, DateTime, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

Base = declarative_base()

class DigitalTwinRegistryDB(Base):
    """
        DTR class, holds DTR information has 1:1 mapping with the connector
    """
    __tablename__ = "digital_twin_registry"

    url = Column(String(512), primary_key=True, index=True)
    credentials = Column(String(256), nullable=True)

    def to_dict(self):
        return {
            "url": self.url,
            "credentials": self.credentials
        }

class SubModelServerDB(Base):
    """
        Submodel class that has 1:1 mapping with connector
    """
    __tablename__ = "submodel_server"

    url = Column(String(512), primary_key=True, index=True)
    credentials = Column(String(256), nullable=True)

    def to_dict(self):
        return {
            "url": self.url,
            "credentials": self.credentials
        }

class ConnectorDB(Base):
    """
        Connector class, should act as the single source of truth
        all frontend connector related information must be fetched from this class
    """
    __tablename__ = "connectors"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    url = Column(String(512), nullable=False)
    bpn = Column(String(255), nullable=False)
    chart = Column(String(50), nullable=True)
    version = Column(String(50), default="0.9.0", nullable=True)
    namespace = Column(String(50), nullable=False)
    status = Column(String(50), default="unknown")
    config = Column(JSON, nullable=True,  default=lambda: {})
    iatp_id = Column(String(255), nullable=True)
    cp_hostname = Column(String(255), nullable=True)
    dp_hostname = Column(String(255), nullable=True)
    db_name = Column(String(50), nullable=True)
    db_username = Column(String(50), nullable=True)
    db_password = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(255), nullable=True)
    registry = Column(String(512), ForeignKey("digital_twin_registry.url"), nullable=True)
    submodel = Column(String(512), ForeignKey("submodel_server.url"), nullable=True)

    submodel_rel = relationship("SubModelServerDB", backref="connectors")
    registry_rel = relationship("DigitalTwinRegistryDB", backref="connectors")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "url": self.url,
            "bpn": self.bpn,
            "chart": self.chart,
            "version": self.version,
            "namespace": self.namespace,
            "status": self.status,
            "config": self.config,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "cp_hostname": self.cp_hostname,
            "dp_hostname": self.dp_hostname,
            "registry": self.registry,
            "submodel": self.submodel
        }


class ActivityLog(Base):
    """
        Activity log to keep track of user activity
        Monitor tab in EMC frontend can use information in this table
    """
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    connector_id = Column(Uuid, nullable=True)
    connector_name = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "connector_id": self.connector_id,
            "connector_name": self.connector_name,
            "action": self.action,
            "details": self.details,
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
