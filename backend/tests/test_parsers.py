"""
Tests for the PDF / DOCX parsers and the unified file-parser dispatcher.

DOCX cases build real documents in-memory with python-docx. PDF cases cover
the error paths (invalid bytes); a valid text-bearing PDF is not synthesised
here to avoid adding a PDF-generation dependency.
"""
import io

import pytest
from docx import Document

from app.core.exceptions import FileProcessingError, ValidationError
from app.infrastructure.parsers.docx_parser import extract_text_from_docx
from app.infrastructure.parsers.file_parser import parse_uploaded_file
from app.infrastructure.parsers.pdf_parser import extract_text_from_pdf


def _make_docx_bytes(paragraphs=None, rows=None):
    """Build a DOCX in memory and return its bytes."""
    doc = Document()
    for p in paragraphs or []:
        doc.add_paragraph(p)
    if rows:
        table = doc.add_table(rows=len(rows), cols=1)
        for i, cell_text in enumerate(rows):
            table.cell(i, 0).text = cell_text
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── DOCX extraction ───────────────────────────────────────────────────────────
def test_docx_extracts_paragraphs_and_preserves_tech_terms():
    text = extract_text_from_docx(
        _make_docx_bytes(
            paragraphs=[
                "Skills: C++, C#, .NET, Node.js, CI/CD, REST APIs, SQL, JavaScript",
                "Built a machine learning pipeline.",
            ]
        )
    )
    assert "C++" in text
    assert "JavaScript" in text
    assert "machine learning" in text


def test_docx_extracts_table_cells():
    text = extract_text_from_docx(_make_docx_bytes(rows=["Python", "Docker", "AWS"]))
    assert "Python" in text
    assert "Docker" in text
    assert "AWS" in text


def test_docx_collapses_excessive_blank_lines():
    # Many empty paragraphs should not produce 3+ consecutive newlines.
    text = extract_text_from_docx(
        _make_docx_bytes(paragraphs=["a", "", "", "", "b"])
    )
    assert "\n\n\n" not in text


def test_docx_empty_document_raises():
    with pytest.raises(FileProcessingError):
        extract_text_from_docx(_make_docx_bytes(paragraphs=[]))


def test_docx_corrupted_bytes_raise_file_processing_error():
    with pytest.raises(FileProcessingError):
        extract_text_from_docx(b"this is not a real docx file")


# ── PDF extraction (error paths) ─────────────────────────────────────────────
def test_pdf_invalid_bytes_raise_file_processing_error():
    with pytest.raises(FileProcessingError):
        extract_text_from_pdf(b"%PDF-1.4 this is not a valid pdf body")


# ── Unified dispatcher ────────────────────────────────────────────────────────
def test_file_parser_rejects_unsupported_extension():
    with pytest.raises(ValidationError):
        parse_uploaded_file("notes.txt", b"hello world")


def test_file_parser_rejects_oversized_file(monkeypatch):
    from app.infrastructure.parsers import file_parser
    # MAX_BYTES is computed at import time, so patch the module constant.
    monkeypatch.setattr(file_parser, "MAX_BYTES", 0)
    with pytest.raises(ValidationError):
        parse_uploaded_file("resume.pdf", b"x")


def test_file_parser_dispatches_docx(monkeypatch):
    # Bypass the size limit so the real DOCX bytes are processed.
    from app.infrastructure.parsers import file_parser
    monkeypatch.setattr(file_parser.settings, "MAX_UPLOAD_SIZE_MB", 5)
    text, file_type = parse_uploaded_file(
        "resume.docx", _make_docx_bytes(paragraphs=["Python developer"])
    )
    assert "Python" in text
    assert file_type.value == "docx"
