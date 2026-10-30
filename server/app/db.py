from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def init_db(database_url: str) -> Engine:
    """Create the engine/session factory and the schema. Safe to call again (e.g. in tests)."""
    global _engine, _SessionLocal
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    _engine = create_engine(database_url, connect_args=connect_args)
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)

    from app import models  # noqa: F401  (register tables)

    Base.metadata.create_all(_engine)
    return _engine


def get_session() -> Iterator[Session]:
    """FastAPI dependency."""
    assert _SessionLocal is not None, "init_db() was not called"
    with _SessionLocal() as session:
        yield session


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional scope for background workers."""
    assert _SessionLocal is not None, "init_db() was not called"
    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
