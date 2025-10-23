# app/main.py

from fastapi import FastAPI
# ... other imports

# This line MUST be present and correctly spelled as 'app'
app = FastAPI(
    title="Smart Developer Assistant Backend (Phase 1)",
    version="1.0"
)

# ... rest of your code