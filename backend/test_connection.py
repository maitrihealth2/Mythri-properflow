import time
from core.database.models import engine, SessionLocal
from sqlalchemy import text

def measure_new_connection():
    start = time.time()
    # NullPool means every SessionLocal() checkout creates a new connection internally when a query runs
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return time.time() - start

def measure_reused_connection():
    # If we hold a session, it holds the connection
    with SessionLocal() as db:
        start = time.time()
        db.execute(text("SELECT 1"))
        t1 = time.time() - start
        
        start2 = time.time()
        db.execute(text("SELECT 1"))
        t2 = time.time() - start2
        return t1, t2

if __name__ == "__main__":
    t_new = measure_new_connection()
    t_first, t_reused = measure_reused_connection()
    
    print(f"NEW CONNECTION + QUERY: {t_new:.4f}s")
    print(f"REUSED CONNECTION + QUERY: {t_reused:.4f}s")
