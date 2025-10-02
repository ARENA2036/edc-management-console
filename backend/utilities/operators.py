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
