"""File type enumeration."""
from enum import Enum


class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    DOC = "doc"
