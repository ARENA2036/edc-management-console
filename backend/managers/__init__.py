from .databaseManager import DatabaseManager
from .edcManager import EdcManager

database_manager = None
edc_manager = None
activity_manager = None

def init_db():
    global database_manager
    import os
    #from dotenv import load_dotenv
    #load_dotenv()
    
    #database_url = os.getenv('DATABASE_URL', 'sqlite:///./edc_manager.db')
    database_manager = DatabaseManager('sqlite:///./edc_manager.db')
    return database_manager

def init_edc(settings: dict):
    global edc_manager
    edc_config = {
        "default_url": settings.get("edc", {}).get("defaultUrl", ""),
        "endpoints": settings.get("edc", {}).get("endpoints", {})
    }
    edc_manager = EdcManager(edc_config=edc_config,cluster_config=None, dataspace_config={})
    return edc_manager

def init_activity():
    global activity_manager
    class ActivityManager:
        def get_recent_logs(self, limit: int = 20):
            if database_manager:
                return [log.to_dict() for log in database_manager.get_recent_activity_logs(limit)]
            return []
    
    activity_manager = ActivityManager()
    return activity_manager
