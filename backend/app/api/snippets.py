from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models import UserSnippet
from app.database import get_db
router = APIRouter()

@router.get("/api/snippets/{user_id}")
def get_snippets(user_id: int,db:Session = Depends(get_db)):
    snippets = db.query(UserSnippet).filter_by(user_id=user_id).all()
    return snippets

@router.post("/api/snippets")
def add_snippet(snippet: dict,db:Session = Depends(get_db)):
    snippet_obj = UserSnippet(**snippet)
    db.add(snippet_obj)
    db.commit()
    return {"status": "saved"}
