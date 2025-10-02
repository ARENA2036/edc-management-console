from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models.database import Base, Connector, ActivityLog
from typing import List, Optional
import logging

logger = logging.getLogger('staging')


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

    def create_connector(self, name: str, url: str, bpn: Optional[str] = None, config: Optional[dict] = None) -> Connector:
        session = self.get_session()
        try:
            connector = Connector(name=name, url=url, bpn=bpn, config=config)
            session.add(connector)
            session.commit()
            session.refresh(connector)
            logger.info(f"[DatabaseManager] Created connector: {name}")
            return connector
        finally:
            session.close()

    def get_connector_by_id(self, connector_id: int) -> Optional[Connector]:
        session = self.get_session()
        try:
            return session.query(Connector).filter(Connector.id == connector_id).first()
        finally:
            session.close()

    def get_connector_by_name(self, name: str) -> Optional[Connector]:
        session = self.get_session()
        try:
            return session.query(Connector).filter(Connector.name == name).first()
        finally:
            session.close()

    def get_all_connectors(self) -> List[Connector]:
        session = self.get_session()
        try:
            return session.query(Connector).all()
        finally:
            session.close()

    def update_connector(self, connector_id: int, **kwargs) -> Optional[Connector]:
        session = self.get_session()
        try:
            connector = session.query(Connector).filter(Connector.id == connector_id).first()
            if connector:
                for key, value in kwargs.items():
                    if hasattr(connector, key) and value is not None:
                        setattr(connector, key, value)
                session.commit()
                session.refresh(connector)
                logger.info(f"[DatabaseManager] Updated connector: {connector.name}")
            return connector
        finally:
            session.close()

    def delete_connector(self, connector_id: int) -> bool:
        session = self.get_session()
        try:
            connector = session.query(Connector).filter(Connector.id == connector_id).first()
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
