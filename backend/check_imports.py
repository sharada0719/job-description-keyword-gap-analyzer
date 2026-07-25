"""
Deep import check — imports every app module to catch runtime errors
like bad SQLAlchemy mappings, missing env vars, circular imports, etc.
Run from the backend/ directory.
"""
import sys
import os

# Make sure the app is importable
sys.path.insert(0, os.path.dirname(__file__))

errors = []

modules = [
    "app.core.config",
    "app.core.security",
    "app.core.exceptions",
    "app.core.logging",
    "app.core.dependencies",
    "app.infrastructure.database.base",
    "app.infrastructure.database.session",
    "app.infrastructure.models.user",
    "app.infrastructure.models.resume",
    "app.infrastructure.models.job_description",
    "app.infrastructure.models.analysis",
    "app.infrastructure.models",
    "app.infrastructure.repositories.base_repository",
    "app.infrastructure.repositories.user_repository",
    "app.infrastructure.repositories.resume_repository",
    "app.infrastructure.repositories.job_description_repository",
    "app.infrastructure.repositories.analysis_repository",
    "app.infrastructure.parsers.pdf_parser",
    "app.infrastructure.parsers.docx_parser",
    "app.infrastructure.parsers.file_parser",
    "app.domain.entities.user",
    "app.domain.entities.analysis",
    "app.domain.enums.file_type",
    "app.application.dtos.auth",
    "app.application.dtos.user",
    "app.application.dtos.resume",
    "app.application.dtos.job_description",
    "app.application.dtos.analysis",
    "app.application.dtos.common",
    "app.application.interfaces.repositories",
    "app.application.services.auth_service",
    "app.application.services.user_service",
    "app.application.services.resume_service",
    "app.application.services.job_description_service",
    "app.application.services.analysis_service",
    "app.api.exception_handlers",
    "app.api.v1.router",
    "app.api.v1.endpoints.auth",
    "app.api.v1.endpoints.users",
    "app.api.v1.endpoints.resumes",
    "app.api.v1.endpoints.jobs",
    "app.api.v1.endpoints.analysis",
    "app.main",
]

for mod in modules:
    try:
        __import__(mod)
        print(f"OK  {mod}")
    except Exception as exc:
        print(f"FAIL  {mod}: {exc}")
        errors.append((mod, str(exc)))

print()
if errors:
    print(f"FAILED ({len(errors)}):")
    for mod, err in errors:
        print(f"  {mod}: {err}")
    sys.exit(1)
else:
    print(f"All {len(modules)} modules imported successfully.")
