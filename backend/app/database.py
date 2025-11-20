import os

USE_DB = os.environ.get("USE_DB", "false").lower() == "true"

if not USE_DB:
    # Cloud Run startup mode (no DB)
    def get_db():
        yield None
else:
    # Local development mode (PostgreSQL)
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    SQLALCHEMY_DATABASE_URL = "postgresql://postgres:atos%40123@localhost/sda_dev_db"

    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
