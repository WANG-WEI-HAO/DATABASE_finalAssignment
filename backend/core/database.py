from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

SQLALCHEMY_DATABASE_URL = os.getenv("MYSQL_URI", "mysql+pymysql://root:rootpassword@localhost:3306/quant_db")

try:
    connect_args = {}
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        connect_args = {"check_same_thread": False}
        
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args, echo=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
except Exception as e:
    print(f"Database Config Error: {e}")
    Base = object
    SessionLocal = None
