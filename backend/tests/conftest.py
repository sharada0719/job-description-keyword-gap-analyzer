"""
Shared pytest configuration for the backend test-suite.

Ensures the backend package root is importable as ``app`` regardless of the
directory pytest is invoked from.
"""
import os
import sys

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)
