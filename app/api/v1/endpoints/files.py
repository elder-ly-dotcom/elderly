from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, UploadFile, status


router = APIRouter()
UPLOAD_DIR = Path("uploads")


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile = File(...)) -> dict[str, str]:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    extension = Path(file.filename or "upload.bin").suffix or ".bin"
    filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    content = await file.read()
    destination.write_bytes(content)
    return {"filename": filename, "url": f"/uploads/{filename}"}
