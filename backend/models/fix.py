from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class Fix(Base):
    __tablename__ = "fixes"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    vulnerability_id: Mapped[int] = mapped_column(
        ForeignKey("vulnerabilities.id"),
        nullable=False,
    )

    old_code: Mapped[str] = mapped_column(
    Text,
    nullable=False,
    )

    new_code: Mapped[str] = mapped_column(
    Text,
    nullable=False,
    )

    suggested_code: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        Text,
        default="pending",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )