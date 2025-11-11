from app.models import Base
from app.database import engine

print("🚀 Creating all tables in the database...")
Base.metadata.create_all(bind=engine)
print("✅ Done! All tables created successfully.")