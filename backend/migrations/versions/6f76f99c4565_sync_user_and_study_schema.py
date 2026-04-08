"""sync user and study schema

Revision ID: 6f76f99c4565
Revises: b7e8f3646f0e
Create Date: 2026-04-08 12:06:27.194521

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6f76f99c4565'
down_revision = 'b7e8f3646f0e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('field_descriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_by', sa.Integer(), nullable=True))
        batch_op.create_unique_constraint('uq_field_descriptions_field_name', ['field_name'])
        batch_op.create_foreign_key(
            'fk_field_descriptions_created_by_users',
            'users',
            ['created_by'],
            ['user_id'],
        )

    with op.batch_alter_table('studies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('data_collection_months', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('research_duration_months', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('approved_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('open_until', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('ongoing_until', sa.DateTime(), nullable=True))

    op.execute("UPDATE studies SET data_collection_months = duration_months")
    op.execute("UPDATE studies SET research_duration_months = duration_months")

    with op.batch_alter_table('studies', schema=None) as batch_op:
        batch_op.alter_column('data_collection_months', nullable=False)
        batch_op.alter_column('research_duration_months', nullable=False)
        batch_op.drop_column('duration_months')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('requested_role', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('is_approved', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=True))

    op.execute("UPDATE users SET is_approved = 1 WHERE is_approved IS NULL")
    op.execute("UPDATE users SET is_active = 1 WHERE is_active IS NULL")
    op.execute("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('is_approved', nullable=False)
        batch_op.alter_column('is_active', nullable=False)
        batch_op.alter_column('created_at', nullable=False)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('created_at')
        batch_op.drop_column('is_active')
        batch_op.drop_column('is_approved')
        batch_op.drop_column('requested_role')

    with op.batch_alter_table('studies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('duration_months', sa.INTEGER(), nullable=True))

    op.execute("UPDATE studies SET duration_months = data_collection_months")

    with op.batch_alter_table('studies', schema=None) as batch_op:
        batch_op.alter_column('duration_months', nullable=False)
        batch_op.drop_column('ongoing_until')
        batch_op.drop_column('open_until')
        batch_op.drop_column('approved_at')
        batch_op.drop_column('research_duration_months')
        batch_op.drop_column('data_collection_months')

    with op.batch_alter_table('field_descriptions', schema=None) as batch_op:
        batch_op.drop_constraint('fk_field_descriptions_created_by_users', type_='foreignkey')
        batch_op.drop_constraint('uq_field_descriptions_field_name', type_='unique')
        batch_op.drop_column('created_by')
