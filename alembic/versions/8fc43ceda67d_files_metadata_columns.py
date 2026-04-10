"""files metadata columns

Revision ID: 8fc43ceda67d
Revises: 0952b8490745
Create Date: 2026-04-10 23:44:15.869435

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8fc43ceda67d'
down_revision: Union[str, Sequence[str], None] = '0952b8490745'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('files') as batch_op:
        batch_op.add_column(sa.Column('name', sa.String(length=255), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('size', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('url', sa.String(length=500), nullable=False, server_default=''))
        batch_op.alter_column('name', server_default=None)
        batch_op.alter_column('size', server_default=None)
        batch_op.alter_column('url', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('files') as batch_op:
        batch_op.drop_column('url')
        batch_op.drop_column('size')
        batch_op.drop_column('name')
