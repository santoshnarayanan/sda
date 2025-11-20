# app/speech_service.py
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import OpenAI
 
router = APIRouter()

# Determine whether Whisper should run from Cloud Run
USE_WHISPER = os.environ.get("USE_WHISPER", "false").lower() == "true"

# If using local Whisper (only for local development)
if USE_WHISPER:
    import whisper
    model = whisper.load_model("base")
else:
    model = None
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


@router.post("/api/v1/transcribe_audio")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribes audio using:
      - Local Whisper model (ONLY if USE_WHISPER=true)
      - OpenAI Whisper API (CLOUD MODE)
    """

    # Save uploaded file temporarily
    audio_path = f"/tmp/{file.filename}"
    with open(audio_path, "wb") as f:
        f.write(await file.read())

    # --- LOCAL MODE (for offline development) ---
    if USE_WHISPER:
        if model is None:
            raise HTTPException(status_code=500, detail="Local Whisper model not available.")
        result = model.transcribe(audio_path)
        return {"text": result.get("text", "")}

    # --- CLOUD MODE: Use OpenAI Whisper API ---
    try:
        with open(audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        return {"text": transcript.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
