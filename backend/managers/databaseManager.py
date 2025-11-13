from sqlalchemy import create_engine, text, Uuid
from sqlalchemy.orm import sessionmaker, Session
from models.database import Base, ConnectorDB, ActivityLog
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.create_tables()

    def create_tables(self):
        Base.metadata.create_all(bind=self.engine)
        logger.info("[DatabaseManager] Database tables created successfully")

    def get_session(self) -> Session:
        return self.SessionLocal()

    def create_connector(self, connector: ConnectorDB) -> ConnectorDB:
        session = self.get_session()
        try:
            session.add(connector)
            session.commit()
            session.refresh(connector)
            logger.info(f"[DatabaseManager] Created connector: {connector.name}")
            return connector
            # Add exception catch and session rollback
        finally:
            session.close()

    def get_connector_by_id(self, connector_id: int) -> Optional[ConnectorDB]:
        session = self.get_session()
        try:
            return session.query(Connector).filter(Connector.id == connector_id).first()
        finally:
            session.close()

    def get_connector_by_name(self, name: str) -> Optional[ConnectorDB]:
        session = self.get_session()
        try:
            return session.query(ConnectorDB).filter(ConnectorDB.name == name).first()
        finally:
            session.close()

    def get_all_connectors(self) -> List[ConnectorDB]:
        session = self.get_session()
        try:
            return session.query(ConnectorDB).all()
        finally:
            session.close()

    def update_connector(self, connector: ConnectorDB) -> Optional[ConnectorDB]:
        session = self.get_session()
        try:
            existing = session.query(ConnectorDB).filter(ConnectorDB.id == connector.id).first()
            if existing:
                existing.status = connector.status
                session.add(existing)
                session.commit()
                session.refresh(existing)
                logger.info(f"[DatabaseManager] Updated connector: {connector.name}")
            return connector
        finally:
            session.close()

    def delete_connector(self, connector_id: int) -> bool:
        session = self.get_session()
        try:
            connector = session.query(ConnectorDB).filter(ConnectorDB.id == connector_id).first()
            if connector:
                session.delete(connector)
                session.commit()
                logger.info(f"[DatabaseManager] Deleted connector: {connector.name}")
                return True
            return False
        finally:
            session.close()

    def log_activity(self, action: str, details: Optional[str] = None,
                     connector_id: Optional[int] = None,
                     connector_name: Optional[str] = None,
                     status: Optional[str] = None):
        session = self.get_session()
        try:
            log = ActivityLog(
                connector_id=connector_id,
                connector_name=connector_name,
                action=action,
                details=details,
                status=status
            )
            session.add(log)
            session.commit()
            logger.debug(f"[DatabaseManager] Logged activity: {action}")
        finally:
            session.close()

    def get_recent_activity(self, limit: int = 50) -> List[ActivityLog]:
        session = self.get_session()
        try:
            return session.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
        finally:
            session.close()