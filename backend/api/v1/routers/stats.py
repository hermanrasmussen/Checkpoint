from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.v1.utils import entry_to_out
from backend.auth import CurrentUser, get_current_user
from backend.db import get_db
from backend.models import LibraryEntry
from backend.schemas import StatsOut

router = APIRouter()


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid {field}") from e


@router.get("", response_model=StatsOut)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> StatsOut:
    user_uuid = _parse_uuid(user.id, field="user_id")

    total = await db.scalar(
        select(func.count()).select_from(LibraryEntry).where(LibraryEntry.user_id == user_uuid)
    )
    total = int(total or 0)

    rows = await db.execute(
        select(LibraryEntry.status, func.count())
        .where(LibraryEntry.user_id == user_uuid)
        .group_by(LibraryEntry.status)
    )
    by_status: dict[str, int] = {k: 0 for k in ["playing", "completed", "backlog", "dropped"]}
    for st, count in rows.all():
        by_status[str(st)] = int(count)

    avg = await db.scalar(
        select(func.avg(LibraryEntry.rating)).where(
            LibraryEntry.user_id == user_uuid, LibraryEntry.rating.is_not(None)
        )
    )
    average_rating = float(avg) if avg is not None else None

    recent_res = await db.scalars(
        select(LibraryEntry)
        .options(selectinload(LibraryEntry.game))
        .where(LibraryEntry.user_id == user_uuid)
        .order_by(LibraryEntry.added_at.desc())
        .limit(5)
    )
    recent_entries = recent_res.unique().all()

    return StatsOut(
        total=total,
        by_status=by_status,  # type: ignore[arg-type]
        average_rating=average_rating,
        recent=[entry_to_out(e) for e in recent_entries],
    )
