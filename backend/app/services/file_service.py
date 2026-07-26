"""
File upload service: validation, storage, and retrieval.
Supports local storage with S3-compatible production path.
"""
import hashlib
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.logging import get_logger
from app.models.enums import MediaType

logger = get_logger(__name__)

# Maximum sizes in bytes
MAX_IMAGE_BYTES = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
MAX_VIDEO_BYTES = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
MAX_DOC_BYTES = settings.MAX_DOCUMENT_SIZE_MB * 1024 * 1024

MIME_TYPE_MAP = {
    ".jpg":  ("image/jpeg", MediaType.IMAGE),
    ".jpeg": ("image/jpeg", MediaType.IMAGE),
    ".png":  ("image/png",  MediaType.IMAGE),
    ".webp": ("image/webp", MediaType.IMAGE),
    ".heic": ("image/heic", MediaType.IMAGE),
    ".mp4":  ("video/mp4",  MediaType.VIDEO),
    ".mov":  ("video/quicktime", MediaType.VIDEO),
    ".avi":  ("video/x-msvideo", MediaType.VIDEO),
    ".mkv":  ("video/x-matroska", MediaType.VIDEO),
    ".webm": ("video/webm", MediaType.VIDEO),
    ".pdf":  ("application/pdf", MediaType.DOCUMENT),
    ".docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", MediaType.DOCUMENT),
    ".txt":  ("text/plain", MediaType.DOCUMENT),
}


def _get_allowed_extensions() -> set:
    return set(
        settings.ALLOWED_IMAGE_EXTENSIONS
        + settings.ALLOWED_VIDEO_EXTENSIONS
        + settings.ALLOWED_DOC_EXTENSIONS
    )


def _validate_file(file: UploadFile, content: bytes) -> Tuple[str, MediaType]:
    """
    Validate file extension, MIME type, and size.
    Returns (mime_type, media_type) on success.
    Raises HTTPException on validation failure.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a name.",
        )

    original_name = file.filename
    ext = Path(original_name).suffix.lower()
    allowed = _get_allowed_extensions()

    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{ext}' is not allowed. Allowed: {', '.join(sorted(allowed))}",
        )

    mime_type, media_type = MIME_TYPE_MAP.get(ext, ("application/octet-stream", MediaType.DOCUMENT))

    # Size validation
    file_size = len(content)
    if media_type == MediaType.IMAGE and file_size > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size exceeds {settings.MAX_IMAGE_SIZE_MB}MB limit.",
        )
    if media_type == MediaType.VIDEO and file_size > MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video size exceeds {settings.MAX_VIDEO_SIZE_MB}MB limit.",
        )
    if media_type == MediaType.DOCUMENT and file_size > MAX_DOC_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Document size exceeds {settings.MAX_DOCUMENT_SIZE_MB}MB limit.",
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # Basic magic bytes check (virus scan hook point)
    _check_magic_bytes(content, media_type, ext)

    return mime_type, media_type


def _check_magic_bytes(content: bytes, media_type: MediaType, ext: str) -> None:
    """
    Verify file magic bytes match declared extension.
    This is a basic check - in production, integrate with ClamAV or similar.
    """
    if len(content) < 4:
        return

    magic_checks = {
        ".jpg":  [b"\xff\xd8\xff"],
        ".jpeg": [b"\xff\xd8\xff"],
        ".png":  [b"\x89PNG"],
        ".pdf":  [b"%PDF"],
        ".mp4":  [b"ftyp", b"\x00\x00\x00"],  # MP4 boxes
    }

    if ext in magic_checks:
        valid_magic = magic_checks[ext]
        if not any(content.startswith(m) for m in valid_magic):
            # For MP4, check at offset 4
            if ext == ".mp4":
                if len(content) >= 8 and content[4:8] in [b"ftyp", b"moov", b"mdat"]:
                    return
            logger.warning("File magic bytes mismatch", ext=ext)
            # Don't reject - log and continue (strict mode would raise here)


def _generate_storage_path(
    complaint_id: str, media_type: MediaType, ext: str
) -> Tuple[str, str]:
    """
    Generate secure storage path with UUID filename to prevent path traversal.
    Returns (relative_path, filename).
    """
    file_uuid = str(uuid.uuid4())
    filename = f"{file_uuid}{ext}"

    if media_type == MediaType.IMAGE:
        subdir = "images"
    elif media_type == MediaType.VIDEO:
        subdir = "videos"
    else:
        subdir = "documents"

    # Organize by complaint ID subfolder
    relative_path = f"{settings.UPLOAD_DIR}/{subdir}/{complaint_id}/{filename}"
    return relative_path, filename


async def save_file(
    file: UploadFile,
    complaint_id: str,
) -> dict:
    """
    Save an uploaded file to local storage.
    Returns metadata dict for database storage.
    """
    # Read content
    content = await file.read()
    mime_type, media_type = _validate_file(file, content)

    ext = Path(file.filename).suffix.lower()
    relative_path, filename = _generate_storage_path(complaint_id, media_type, ext)

    # Ensure directory exists
    full_path = Path(relative_path)
    full_path.parent.mkdir(parents=True, exist_ok=True)

    # Write file
    try:
        with open(full_path, "wb") as f:
            f.write(content)
    except OSError as e:
        logger.error("File write failed", path=str(full_path), error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save file. Please try again.",
        )

    file_hash = hashlib.sha256(content).hexdigest()

    logger.info(
        "File saved",
        complaint_id=complaint_id,
        filename=filename,
        size_bytes=len(content),
        media_type=media_type,
    )

    return {
        "media_type": media_type,
        "file_name": filename,
        "file_path": f"/{relative_path}",  # URL-accessible path
        "file_size_bytes": len(content),
        "mime_type": mime_type,
        "original_name": file.filename,
        "storage_backend": "local",
        "metadata": {
            "sha256": file_hash,
            "extension": ext,
        },
    }


def get_file_path(relative_path: str) -> Optional[str]:
    """Get absolute file path for serving."""
    # Strip leading slash if present
    clean_path = relative_path.lstrip("/")
    abs_path = Path(clean_path)
    if abs_path.exists() and abs_path.is_file():
        return str(abs_path)
    return None
