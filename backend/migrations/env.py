"""Alembic migration environment configuration."""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

# Import all models so Alembic can detect schema changes
from app.models import *  # noqa: F401,F403
from app.db.base import Base
from app.core.config import settings

# Alembic Config object
config = context.config

# Override sqlalchemy.url with the value from settings (reads DATABASE_URL env var).
# This means alembic.ini sqlalchemy.url is ignored — settings always win.
_db_url = settings.DATABASE_URL.replace("%", "%%")
config.set_main_option("sqlalchemy.url", _db_url)

# Configure Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData for autogenerate support
target_metadata = Base.metadata

# SSL args for Supabase / production PostgreSQL
_connect_args: dict = {}
if "supabase" in settings.DATABASE_URL.lower() or settings.APP_ENV == "production":
    _connect_args = {"sslmode": "require"}


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection needed)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode with a live DB connection."""
    # Create engine directly using settings (not alembic.ini) so SSL is applied
    connectable = create_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,  # NullPool is correct for migration scripts
        connect_args=_connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
