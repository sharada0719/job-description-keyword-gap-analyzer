"""add_job_applications_table

Revision ID: c4a2b8f3e1d7
Revises: b3c7e1f9d2a4
Create Date: 2026-10-28 18:00:00.000000

Creates the `job_applications` table for the Job Application Tracker feature.
This is a non-destructive, additive migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4a2b8f3e1d7'
down_revision: Union[str, None] = 'b3c7e1f9d2a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'job_applications',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('job_title', sa.String(255), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=True),
        sa.Column('job_location', sa.String(255), nullable=True),
        sa.Column('job_description', sa.Text(), nullable=True),
        sa.Column('job_url', sa.Text(), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('application_status', sa.String(20), nullable=False, server_default='saved', index=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('job_applications')
