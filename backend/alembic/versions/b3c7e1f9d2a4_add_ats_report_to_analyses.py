"""add_ats_report_to_analyses

Revision ID: b3c7e1f9d2a4
Revises: a1aab6c13e2a
Create Date: 2026-10-28 12:00:00.000000

Adds a nullable JSON column `ats_report` to the analyses table so the ATS
compatibility report can be stored alongside the job-match results.

This is a non-destructive, additive migration: existing rows keep all their
data and simply get NULL for the new column.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c7e1f9d2a4'
down_revision: Union[str, None] = 'a1aab6c13e2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('analyses', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ats_report', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('analyses', schema=None) as batch_op:
        batch_op.drop_column('ats_report')
