from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from backend.core.database import Base
from datetime import datetime

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), index=True)
    action = Column(String(10))  # BUY / SELL
    price = Column(Float)
    quantity = Column(Integer)
    status = Column(String(20), default="FILLED")
    timestamp = Column(DateTime, default=datetime.utcnow)
