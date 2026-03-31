"""add optional study fields

Revision ID: b7e8f3646f0e
Revises: 12b3aaebf72e
Create Date: 2026-03-31 12:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b7e8f3646f0e"
down_revision = "12b3aaebf72e"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("study_required_fields", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.true())
        )

    op.execute("UPDATE studies SET status = 'ongoing' WHERE status = 'approved'")
    op.execute("UPDATE studies SET status = 'open' WHERE status = 'pending'")
    op.execute("UPDATE studies SET status = 'complete' WHERE status = 'closed'")


def downgrade():
    with op.batch_alter_table("study_required_fields", schema=None) as batch_op:
        batch_op.drop_column("is_required")

    op.execute("UPDATE studies SET status = 'approved' WHERE status = 'ongoing'")
    op.execute("UPDATE studies SET status = 'pending' WHERE status = 'open'")
    op.execute("UPDATE studies SET status = 'closed' WHERE status = 'complete'")
