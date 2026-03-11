import tempfile
import os
from fastapi import APIRouter, UploadFile, File

router = APIRouter()

model = None

try:
    import whisper
    model = whisper.load_model("base")
except Exception as e:
    print("Whisper disabled:", e)


@router.post("/api/v1/transcribe_audio")
async def transcribe_audio(file: UploadFile = File(...)):

    if model is None:
        return {"error": "Speech service disabled"}

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        result = model.transcribe(tmp_path)

        os.remove(tmp_path)

        return {"text": result["text"]}

    except Exception as e:
        print("Transcription error:", e)
        return {"error": str(e)}