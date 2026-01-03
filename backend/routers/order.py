from fastapi import APIRouter

router = APIRouter()

@router.post("/order/create")
def create_order():
    return {"status": "Order Created"}
