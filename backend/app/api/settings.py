from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models import UserSettings
from app.database import get_db

router = APIRouter()

@router.get("/api/settings/{user_id}")
def get_settings(user_id: int,db: Session = Depends(get_db)):
    settings = db.query(UserSettings).filter_by(user_id=user_id).first()
    return settings or {}

@router.post("/api/settings")
def update_settings(settings_data: dict,db: Session = Depends(get_db)):
    user_id = settings_data["user_id"]
    settings = db.query(UserSettings).filter_by(user_id=user_id).first()
    if settings:
        for key, value in settings_data.items():
            setattr(settings, key, value)
    else:
        settings = UserSettings(**settings_data)
        db.add(settings)
    db.commit()
    return {"status": "success"}
