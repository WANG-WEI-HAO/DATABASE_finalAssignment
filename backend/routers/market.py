from fastapi import APIRouter

router = APIRouter()

@router.get("/market/info")
def get_market_info():
    return {"info": "Market is Open"}
