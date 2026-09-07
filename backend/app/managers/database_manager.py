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
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, Session, Query
from app.models.database import Base, ConnectorDB, ActivityLog
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

    @staticmethod
    def _owned_by(query: Query, bpn: Optional[str]) -> Query:
        """Restrict ``query`` to the rows owned by ``bpn``.

        ``None`` means "no owner filter" and is the only way to read across
        companies; the empty string is not a wildcard, so a caller whose BPN
        could not be determined cannot be handed the unowned rows. Compared
        case- and trim-insensitively, since rows written before BPNs were
        normalised carry whatever the wizard was given.
        """
        if bpn is None:
            return query
        return query.filter(func.upper(func.trim(ConnectorDB.bpn)) == bpn.strip().upper())

    def get_connector_by_id(self, connector_id: int,
                            bpn: Optional[str] = None) -> Optional[ConnectorDB]:
        session = self.get_session()
        try:
            query = self._owned_by(session.query(ConnectorDB), bpn)
            return query.filter(ConnectorDB.id == connector_id).first()
        finally:
            session.close()

    def get_connector_by_name(self, name: str,
                              bpn: Optional[str] = None) -> Optional[ConnectorDB]:
        """None when the name is unknown *or* owned by another BPN. Names are
        unique table-wide, so an unfiltered lookup is what tells a deployment
        whether a name is free at all."""
        session = self.get_session()
        try:
            query = self._owned_by(session.query(ConnectorDB), bpn)
            return query.filter(ConnectorDB.name == name).first()
        finally:
            session.close()

    def get_all_connectors(self, bpn: Optional[str] = None) -> List[ConnectorDB]:
        session = self.get_session()
        try:
            return self._owned_by(session.query(ConnectorDB), bpn).all()
        finally:
            session.close()

    def update_connector(self, connector: ConnectorDB) -> Optional[ConnectorDB]:
        session = self.get_session()
        try:
            existing = session.query(ConnectorDB).filter(ConnectorDB.id == connector.id).first()
            if existing:
                existing.name = connector.name
                existing.url = connector.url
                existing.bpn = connector.bpn
                existing.chart = connector.chart
                existing.version = connector.version
                existing.namespace = connector.namespace
                existing.status = connector.status
                existing.config = connector.config
                existing.iatp_id = connector.iatp_id
                existing.cp_hostname = connector.cp_hostname
                existing.dp_hostname = connector.dp_hostname
                existing.db_name = connector.db_name
                existing.db_username = connector.db_username
                existing.db_password = connector.db_password
                existing.created_by = connector.created_by
                existing.registry = connector.registry
                existing.submodel = connector.submodel
                session.add(existing)
                session.commit()
                session.refresh(existing)
                logger.info(f"[DatabaseManager] Updated connector: {connector.name}")
                return existing
            return None
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
