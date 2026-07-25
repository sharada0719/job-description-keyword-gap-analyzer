"""
Unified file parser — dispatches to the correct backend based on extension.
"""
from app.core.config import settings
from app.core.exceptions import FileProcessingError, ValidationError
from app.core.logging import get_logger
from app.domain.enums.file_type import FileType
from app.infrastructure.parsers.docx_parser import extract_text_from_docx
from app.infrastructure.parsers.pdf_parser import extract_text_from_pdf

logger = get_logger("parsers.file")

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def parse_uploaded_file(filename: str, file_bytes: bytes) -> tuple[str, FileType]:
    """
    Validate file size and extension, then extract text.

    Returns:
        (extracted_text, FileType)

    Raises:
        ValidationError  — unsupported extension or file too large
        FileProcessingError — text extraction failed
    """
    if len(file_bytes) > MAX_BYTES:
        raise ValidationError(
            f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS_LIST:
        raise ValidationError(
            f"Unsupported file type '.{ext}'. "
            f"Allowed: {', '.join(settings.ALLOWED_EXTENSIONS_LIST)}"
        )

    if ext == FileType.PDF.value:
        text = extract_text_from_pdf(file_bytes)
        return text, FileType.PDF
    elif ext in (FileType.DOCX.value, FileType.DOC.value):
        text = extract_text_from_docx(file_bytes)
        return text, FileType.DOCX
    else:
        raise ValidationError(f"No parser available for extension: {ext}")
