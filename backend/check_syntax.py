"""Final syntax check for all backend Python files."""
import py_compile, pathlib, sys

BASE = pathlib.Path(__file__).parent / "app"
EXTRA = [pathlib.Path(__file__).parent / "alembic" / "env.py"]

FILES = [
    BASE / "core/config.py",
    BASE / "core/security.py",
    BASE / "core/logging.py",
    BASE / "core/exceptions.py",
    BASE / "core/dependencies.py",
    BASE / "infrastructure/database/base.py",
    BASE / "infrastructure/database/session.py",
    BASE / "infrastructure/models/user.py",
    BASE / "infrastructure/models/resume.py",
    BASE / "infrastructure/models/job_description.py",
    BASE / "infrastructure/models/analysis.py",
    BASE / "infrastructure/models/__init__.py",
    BASE / "infrastructure/repositories/base_repository.py",
    BASE / "infrastructure/repositories/user_repository.py",
    BASE / "infrastructure/repositories/resume_repository.py",
    BASE / "infrastructure/repositories/job_description_repository.py",
    BASE / "infrastructure/repositories/analysis_repository.py",
    BASE / "infrastructure/repositories/__init__.py",
    BASE / "infrastructure/parsers/pdf_parser.py",
    BASE / "infrastructure/parsers/docx_parser.py",
    BASE / "infrastructure/parsers/file_parser.py",
    BASE / "infrastructure/parsers/__init__.py",
    BASE / "infrastructure/ai/nlp_engine.py",
    BASE / "infrastructure/ai/keyword_extractor.py",
    BASE / "infrastructure/ai/similarity_scorer.py",
    BASE / "infrastructure/ai/__init__.py",
    BASE / "domain/entities/user.py",
    BASE / "domain/entities/analysis.py",
    BASE / "domain/entities/__init__.py",
    BASE / "domain/enums/file_type.py",
    BASE / "domain/enums/__init__.py",
    BASE / "application/dtos/auth.py",
    BASE / "application/dtos/user.py",
    BASE / "application/dtos/resume.py",
    BASE / "application/dtos/job_description.py",
    BASE / "application/dtos/analysis.py",
    BASE / "application/dtos/common.py",
    BASE / "application/dtos/__init__.py",
    BASE / "application/interfaces/repositories.py",
    BASE / "application/interfaces/__init__.py",
    BASE / "application/services/auth_service.py",
    BASE / "application/services/user_service.py",
    BASE / "application/services/resume_service.py",
    BASE / "application/services/job_description_service.py",
    BASE / "application/services/analysis_service.py",
    BASE / "application/services/__init__.py",
    BASE / "api/exception_handlers.py",
    BASE / "api/v1/router.py",
    BASE / "api/v1/endpoints/auth.py",
    BASE / "api/v1/endpoints/users.py",
    BASE / "api/v1/endpoints/resumes.py",
    BASE / "api/v1/endpoints/jobs.py",
    BASE / "api/v1/endpoints/analysis.py",
    BASE / "main.py",
] + EXTRA

errors = 0
for path in FILES:
    rel = str(path).replace(str(BASE.parent) + "\\", "")
    if not path.exists():
        print(f"MISSING  : {rel}")
        errors += 1
        continue
    try:
        py_compile.compile(str(path), doraise=True)
        print(f"OK       : {rel}")
    except py_compile.PyCompileError as exc:
        print(f"FAIL     : {rel}\n           {exc}")
        errors += 1

print()
if errors == 0:
    print(f"All {len(FILES)} files passed.")
else:
    print(f"ERRORS: {errors}/{len(FILES)}")
    sys.exit(1)
