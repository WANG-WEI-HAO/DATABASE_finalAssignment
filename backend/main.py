from fastapi import FastAPI
from contextlib import asynccontextmanager
import threading
import redis
import json
import os
import random
import time
from dotenv import load_dotenv

# from .fubon.streamer import start_stream
# from .fubon.auth import session
# Fubon API removed as requested

load_dotenv()

# Redis Init for Main App
try:
    r = redis.Redis(
        host=os.getenv("REDIS_HOST", 'localhost'), 
        port=int(os.getenv("REDIS_PORT", 6379)), 
        password=os.getenv("REDIS_PASSWORD", 'redispassword'), 
        decode_responses=True
    )
except Exception as e:
    print(f"Redis Init Error: {e}")
    r = None

# Database Models
from backend.models.database import Transaction, Base
from backend.core.database import engine, SessionLocal

# Create Tables
Base.metadata.create_all(bind=engine)

# Global Log Buffer
from collections import deque
system_logs = deque(maxlen=50)

def add_log(msg, type="info"):
    timestamp = time.strftime("%H:%M:%S")
    icon = "ℹ️"
    if type == "sql": icon = "💾"
    if type == "redis": icon = "⚡"
    if type == "sim": icon = "🎲"
    
    log_entry = {
        "time": timestamp,
        "msg": msg,
        "type": type,
        "icon": icon
    }
    system_logs.appendleft(log_entry)

# Market Simulation
class MarketSimulator:
    def __init__(self):
        self.stocks = {
            "2330": {"price": 1000.0, "open": 1000.0, "name": "TSMC (台積電)"},
            "2317": {"price": 105.0, "open": 105.0, "name": "Foxconn (鴻海)"},
            "2454": {"price": 950.0, "open": 950.0, "name": "MTK (聯發科)"},
            "2603": {"price": 150.0, "open": 150.0, "name": "Evergreen (長榮)"},
            "2881": {"price": 65.0, "open": 65.0, "name": "Fubon (富邦金)"},
            "2412": {"price": 120.0, "open": 120.0, "name": "CHT (中華電)"},
            "1301": {"price": 50.0, "open": 50.0, "name": "Formosa (台塑)"},
            "1303": {"price": 60.0, "open": 60.0, "name": "Nan Ya (南亞)"},
            "2882": {"price": 45.0, "open": 45.0, "name": "Cathay (國票金)"},
            "3008": {"price": 3000.0, "open": 3000.0, "name": "Largan (大立光)"}
        }
        self.metrics = {"sql_ops": 0, "redis_ops": 0}
        self.ops_counters = {"sql": 0, "redis": 0}
        
        self.running = True
        # Start threads
        threading.Thread(target=self._price_loop, daemon=True).start()
        threading.Thread(target=self._trade_loop, daemon=True).start()
        threading.Thread(target=self._metrics_loop, daemon=True).start()

    def _metrics_loop(self):
        """Calculates Operations Per Second (OPS)"""
        while self.running:
            time.sleep(1)
            self.metrics["sql_ops"] = self.ops_counters["sql"]
            self.metrics["redis_ops"] = self.ops_counters["redis"]
            # Reset
            self.ops_counters["sql"] = 0
            self.ops_counters["redis"] = 0

    def _price_loop(self):
        """Simulate random walk price movement"""
        while self.running:
            for sym, data in self.stocks.items():
                # -1.5% to +1.5% fluctuation (Volatile)
                change = random.uniform(-0.015, 0.015)
                new_price = data["price"] * (1 + change)
                self.stocks[sym]["price"] = round(new_price, 2)
                
                # Update History (Keep last 30 points)
                if "history" not in self.stocks[sym]:
                    self.stocks[sym]["history"] = []
                self.stocks[sym]["history"].append(round(new_price, 2))
                if len(self.stocks[sym]["history"]) > 30:
                    self.stocks[sym]["history"].pop(0)
                    
            time.sleep(1) # Update prices every second

    def _trade_loop(self):
        """Generates random trades for multiple stocks simultaneously"""
        while self.running:
            try:
                # Batch processing interval
                time.sleep(0.5)

                db = SessionLocal()
                
                # Iterate through ALL stocks to simulate simultaneous activity
                # Randomize order to prevent bias
                stock_list = list(self.stocks.keys())
                random.shuffle(stock_list)
                
                for sym in stock_list:
                    # 30% chance to trade per tick per stock (Busy Market)
                    if random.random() > 0.7: 
                        current_price = self.stocks[sym]["price"]
                        
                        # Add some noise to trade price
                        trade_price = round(current_price * (1 + random.uniform(-0.001, 0.001)), 1)
                        qty = random.randint(1, 20) * 1000 
                        action = random.choice(["BUY", "SELL"])
                        
                        new_tx = Transaction(
                            symbol=f"{sym}",
                            action=action,
                            price=trade_price,
                            quantity=qty,
                            status="FILLED"
                        )
                        db.add(new_tx)
                        
                        # Log Sim Activity
                        add_log(f"SQL INSERT: {action} {sym} @ {trade_price}", "sql")
                        self.ops_counters["sql"] += 1
                        
                        # Simulate Redis Cache Invalidation
                        if random.random() > 0.6:
                             add_log(f"REDIS UPDATE: Refreshed {sym}", "redis")
                             self.ops_counters["redis"] += 1

                db.commit()
                db.close()

            except Exception as e:
                print(f"Sim Trade Error: {e}")

    def get_quote(self, stock_id):
        stock = self.stocks.get(stock_id)
        if not stock: # Fallback if not in sim list
             base = 100.0
             return {
                 "symbol": stock_id,
                 "name": f"{stock_id} (Mock)",
                 "closePrice": base,
                 "change": 0.0,
                 "ts": int(time.time() * 1000)
             }
        
        change_val = stock["price"] - stock["open"]
        change_p = (change_val / stock["open"]) * 100
        
        return {
            "symbol": stock_id,
            "name": stock["name"],
            "closePrice": stock["price"],
            "change": round(change_p, 2),
            "ts": int(time.time() * 1000)
        }

    def get_all_quotes(self):
        snapshot = []
        for stock_id in self.stocks:
            snapshot.append(self.get_quote(stock_id))
        return sorted(snapshot, key=lambda x: x['symbol'])

market_sim = MarketSimulator()

# Life Cycle Management
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 System Starting (Yahoo Finance / Mock Mode)...")
    add_log("System initialized.", "info")
    # No external broker login needed
    yield
    print("🛑 System Shutdown")
    
# ... (imports) ...
# The following imports were originally here, but SessionLocal is now imported above.
# from backend.core.database import SessionLocal
from sqlalchemy import text
import random
import time

app = FastAPI(title="TW-Stock-Quant", lifespan=lifespan)

# ... (middleware) ...

# ... (existing endpoints) ...

@app.get("/api/market/snapshot")
def get_market_snapshot():
    return market_sim.get_all_quotes()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
def get_system_status():
    status = {
        "redis": {"status": "Offline", "keys": 0, "memory": "0B", "ops": 0},
        "mysql": {"status": "Offline", "rows": 0, "ops": 0},
        "broker": "Yahoo Finance / Mock Mode"
    }

    # Retrieve Sim Metrics
    status["mysql"]["ops"] = market_sim.metrics["sql_ops"]
    status["redis"]["ops"] = market_sim.metrics["redis_ops"]

    # Check Redis
    if r:
        try:
            r.ping()
            info = r.info(section="memory")
            status["redis"]["status"] = "Online 🟢"
            status["redis"]["keys"] = r.dbsize()
            status["redis"]["memory"] = info.get("used_memory_human", "N/A")
        except Exception:
            status["redis"]["status"] = "Error 🔴"

    # Check MySQL
    try:
        if SessionLocal:
            db = SessionLocal()
            # simple query to check connection
            count = db.query(Transaction).count()
            status["mysql"]["status"] = "Online 🟢"
            status["mysql"]["rows"] = count
            db.close()
    except Exception as e:
        status["mysql"]["status"] = f"Error 🔴"
        print(f"DB Error: {e}")

    return status

@app.get("/api/transactions")
def get_transactions():
    try:
        db = SessionLocal()
        txs = db.query(Transaction).order_by(Transaction.id.desc()).limit(10).all()
        db.close()
        return {
            "data": [
                {
                    "id": t.id,
                    "symbol": t.symbol,
                    "action": t.action,
                    "price": t.price,
                    "quantity": t.quantity,
                    "time": t.timestamp.strftime("%H:%M:%S")
                } 
                for t in txs
            ]
        }
    except Exception as e:
        return {"data": []}

@app.get("/api/quote/{stock_id}")
def get_quote(stock_id: str):
    trace_log = []
    
    # Try Redis first
    if r:
        try:
            trace_log.append("🔍 Redis: Checking cache...")
            data = r.get(f"stock:realtime:{stock_id}")
            if data:
                trace_log.append("✅ Redis: HIT! Serving from Cache.")
                return {
                    "source": "Redis Cache", 
                    "data": json.loads(data),
                    "trace_log": trace_log
                }
            trace_log.append("⚠️ Redis: MISS. Proceeding to Data Source.")
        except Exception:
            trace_log.append("❌ Redis: Connection Failed.")
            pass 
            
    # Market Simulation Mode
    trace_log.append("🔄 Simulation: Generating realtime market data...")
    try:
        data = market_sim.get_quote(stock_id)
        trace_log.append(f"🟢 Simulation: Success ({data['name']})")
        return {
            "source": "Market Simulator (Live)", 
            "data": data,
            "trace_log": trace_log
        }
    except Exception as e:
        print(f"Sim Error: {e}")
        trace_log.append(f"🔴 Simulation: Error {e}")
        # Final Fallback
        base_price = 1000 if stock_id == '2330' else 100
        return {
             "source": "Mock (Offline)", 
             "data": {
                 "symbol": stock_id,
                 "name": "Unknown",
                 "closePrice": base_price,
                 "change": 0,
                 "ts": 0
             },
             "trace_log": trace_log
        }

@app.get("/api/search")
def search_stock(q: str):
    """
    Unified Search Endpoint (Double Database Integration)
    """
    stock_id = q.strip()
    trace_log = []
    
    # 1. Market Data (Source A)
    market_data = None
    
    trace_log.append(f"--- Step 1: Realtime Data (Stock: {stock_id}) ---")
    # Try Sim
    try:
        trace_log.append("⚙️ Sim Engine: Computing Price Model...")
        sim_data = market_sim.get_quote(stock_id)
        if sim_data and sim_data["name"] != f"{stock_id} (Mock)":
            market_data = sim_data
            trace_log.append("✅ Sim Engine: Data Generated.")
            # Inject history if available from sim
            if stock_id in market_sim.stocks:
                market_data["history"] = market_sim.stocks[stock_id].get("history", [])
        else:
            trace_log.append("⚠️ Sim Engine: Stock not in heavy simulation (Using Mock).")
    except:
        trace_log.append("❌ Sim Engine: Error.")
        pass
        
    if not market_data:
        # Fallback Mock
        market_data = {
            "symbol": stock_id,
            "name": f"{stock_id}",
            "closePrice": 100.0,
            "change": 0.0,
            "history": [100.0] * 20 # Mock history
        }

    # 2. Transaction Data (Source B - MySQL)
    tx_list = []
    trace_log.append(f"--- Step 2: Historical Data (MySQL) ---")
    try:
        trace_log.append("🔌 SQL: Connecting to MySQL Database...")
        db = SessionLocal()
        # Search by symbol (handling potential .TW suffix differences)
        fuzzy_query = f"{stock_id}%"
        trace_log.append(f"🔍 SQL: SELECT * FROM transactions WHERE symbol LIKE '{fuzzy_query}' ORDER BY time DESC")
        
        txs = db.query(Transaction).filter(Transaction.symbol.like(fuzzy_query)).order_by(Transaction.timestamp.desc()).all()
        trace_log.append(f"✅ SQL: Found {len(txs)} records.")
        
        tx_list = [
            {
                "id": t.id,
                "action": t.action,
                "price": t.price,
                "quantity": t.quantity,
                "date": t.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            }
            for t in txs
        ]
        db.close()
    except Exception as e:
        trace_log.append(f"❌ SQL: Error ({str(e)})")
        print(f"DB Search Error: {e}")

    return {
        "symbol": stock_id,
        "market_data": market_data,
        "transactions": tx_list,
        "trace_log": trace_log,
        "analysis": {
            "total_trades": len(tx_list),
            "data_sources": ["Market Engine (Live)", "Trade DB (Persistent)"]
        }
    }

@app.get("/api/logs")
def get_system_logs():
    return list(system_logs)

# Frontend Integration
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Mount Static Files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

# Future: Includes Routers
# app.include_router(market.router)
# app.include_router(order.router)
