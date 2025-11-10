import whisper
from fastapi import APIRouter, UploadFile, File

router = APIRouter()
model = whisper.load_model("base")


@router.post("/api/v1/transcribe_audio")
async def transcribe_audio(file: UploadFile = File(...)):
    audio_path = f"/tmp/{file.filename}"
    with open(audio_path, "wb") as f:
        f.write(await file.read())

    result = model.transcribe(audio_path)
    return {"text": result["text"]}
