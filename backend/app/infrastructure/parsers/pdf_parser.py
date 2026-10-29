"""
PDF text extraction using pdfplumber.
"""
import io
import re

import pdfplumber

from app.core.exceptions import FileProcessingError
from app.core.logging import get_logger

logger = get_logger("parsers.pdf")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract all text from a PDF given its raw bytes.
    Raises FileProcessingError if the file cannot be read or yields no text.
    """
    try:
        text_parts: list[str] = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text.strip())

        # Collapse excessive blank lines (common in multi-column PDFs) while
        # preserving section structure.
        full_text = "\n\n".join(text_parts).strip()
        full_text = re.sub(r"\n{3,}", "\n\n", full_text)
        if not full_text:
            raise FileProcessingError(
                "Could not extract text from PDF. "
                "The file may be image-based or password-protected."
            )
        logger.debug("PDF parsed successfully (%d chars)", len(full_text))
        return full_text

    except FileProcessingError:
        raise
    except Exception as exc:
        logger.error("PDF parsing failed: %s", exc)
        raise FileProcessingError(f"PDF parsing error: {exc}") from exc
