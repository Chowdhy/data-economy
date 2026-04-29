"""add activity logs and study researchers

Revision ID: e5f6a7b8c9d0
Revises: 253dc6d9d810
Create Date: 2026-04-29 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = '253dc6d9d810'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'activity_logs',
        sa.Column('log_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('study_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('log_id'),
    )

    op.create_table(
        'study_researchers',
        sa.Column('study_id', sa.Integer(), nullable=False),
        sa.Column('researcher_id', sa.Integer(), nullable=False),
        sa.Column('access_level', sa.String(length=50), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['researcher_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['study_id'], ['studies.study_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('study_id', 'researcher_id'),
    )


def downgrade():
    op.drop_table('study_researchers')
    op.drop_table('activity_logs')
