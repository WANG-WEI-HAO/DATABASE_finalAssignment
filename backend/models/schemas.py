from pydantic import BaseModel

class TransactionBase(BaseModel):
    stock_id: str
    price: float
    quantity: int
    action: str

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    
    class Config:
        orm_mode = True
