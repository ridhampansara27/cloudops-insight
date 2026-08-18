# Import SQLAlchemy metadata support.
from sqlalchemy import MetaData

# Import SQLAlchemy's modern declarative ORM base class.
from sqlalchemy.orm import DeclarativeBase

# Define predictable database constraint naming for Alembic migrations.
NAMING_CONVENTION = {
    # Define index names.
    "ix": "ix_%(column_0_label)s",
    # Define unique-constraint names.
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    # Define check-constraint names.
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    # Define foreign-key names.
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    # Define primary-key names.
    "pk": "pk_%(table_name)s",
}


# Create the shared declarative ORM base.
class Base(DeclarativeBase):
    # Apply the naming convention to every table created by the application.
    metadata = MetaData(
        naming_convention=NAMING_CONVENTION,
    )
