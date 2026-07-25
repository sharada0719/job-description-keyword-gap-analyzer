"""
DOCX / DOC text extraction using python-docx.
"""
import io

from docx import Document
from docx.opc.exceptions import PackageNotFoundError

from app.core.exceptions import FileProcessingError
from app.core.logging import get_logger

logger = get_logger("parsers.docx")


def extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Extract all paragraph text from a DOCX file.
    Raises FileProcessingError on invalid or empty documents.
    """
    try:
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        # Also extract text from tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    if cell_text:
                        paragraphs.append(cell_text)

        full_text = "\n".join(paragraphs).strip()
        if not full_text:
            raise FileProcessingError(
                "Could not extract text from the document. The file appears to be empty."
            )
        logger.debug("DOCX parsed successfully (%d chars)", len(full_text))
        return full_text

    except (FileProcessingError, PackageNotFoundError):
        raise
    except Exception as exc:
        logger.error("DOCX parsing failed: %s", exc)
        raise FileProcessingError(f"DOCX parsing error: {exc}") from exc
