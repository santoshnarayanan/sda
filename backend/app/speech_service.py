import tempfile
import os
import whisper
from fastapi import APIRouter, UploadFile, File

router = APIRouter()
model = whisper.load_model("base")

@router.post("/api/v1/transcribe_audio")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Create proper temp file for Windows
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        result = model.transcribe(tmp_path)

        # Clean up file
        os.remove(tmp_path)

        return {"text": result["text"]}

    except Exception as e:
        print("Transcription error:", e)
        return {"error": str(e)}