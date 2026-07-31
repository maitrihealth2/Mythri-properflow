import time
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from loguru import logger
from src.core.config import settings
from src.database.base_model import Base

def create_db_engine():
    """
    Creates the SQLAlchemy engine with production-grade pool configurations
    and robust connection handling.
    """
    connect_args = {}
    if "sqlite" in settings.DATABASE_URL:
        connect_args["check_same_thread"] = False
        
    return create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,       # Self-healing: verify connection liveness before checkout
        pool_recycle=300,         # Recycle connections older than 5 min to prevent stale drops
        pool_reset_on_return="rollback",
        pool_size=settings.DB_POOL_SIZE if "sqlite" not in settings.DATABASE_URL else 5,
        max_overflow=settings.DB_MAX_OVERFLOW if "sqlite" not in settings.DATABASE_URL else 10,
        pool_timeout=10,
    )

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """
    Optional: Logs execution metrics to the central logger for slow queries.
    """
    conn.info.setdefault('query_start_time', []).append(time.time())
    
@event.listens_for(engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    try:
        start_time = conn.info['query_start_time'].pop(-1)
        total_time = time.time() - start_time
        if total_time > 0.5:
            # Log slow queries
            logger.warning(
                f"Slow Query Detected ({total_time:.3f}s)",
                extra={"query": statement.strip()[:100]}
            )
    except Exception:
        pass

def get_db():
    """
    Dependency to generate independent database sessions per request.
    Yields session and securely closes it.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Bootstraps the database tables. Should be managed by Alembic in true production.
    """
    logger.info("Initializing database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
