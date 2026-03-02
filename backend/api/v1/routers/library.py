from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth import CurrentUser, get_current_user
from backend.db import get_db
from backend.integrations.rawg import rawg_client
from backend.integrations.steamgriddb import steamgriddb_client
from backend.api.v1.utils import entry_to_out
from backend.models import FeedPost, Game, LibraryEntry
from backend.schemas import LibraryCreateIn, LibraryEntryOut, LibraryStatus, LibraryUpdateIn
from backend.utils import is_valid_half_star_rating

router = APIRouter()


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid {field}") from e


@router.get("", response_model=list[LibraryEntryOut])
async def get_library(
    status_filter: Optional[LibraryStatus] = Query(default=None, alias="status"),
    sort: str = Query(default="date_added"),
    api_id: Optional[str] = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[LibraryEntryOut]:
    user_uuid = _parse_uuid(user.id, field="user_id")

    stmt = (
        select(LibraryEntry)
        .join(LibraryEntry.game)
        .options(selectinload(LibraryEntry.game))
        .where(LibraryEntry.user_id == user_uuid)
    )

    if status_filter:
        stmt = stmt.where(LibraryEntry.status == status_filter)
    if api_id:
        stmt = stmt.where(Game.api_id == api_id)

    if sort == "date_added":
        stmt = stmt.order_by(LibraryEntry.added_at.desc())
    elif sort == "rating":
        stmt = stmt.order_by(LibraryEntry.rating.desc().nullslast(), LibraryEntry.added_at.desc())
    elif sort == "release_year":
        stmt = stmt.order_by(Game.release_year.desc().nullslast(), LibraryEntry.added_at.desc())
    elif sort == "title":
        stmt = stmt.order_by(Game.title.asc())
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid sort")

    stmt = stmt.offset(offset).limit(limit)
    res = await db.scalars(stmt)
    entries = res.unique().all()
    return [entry_to_out(e) for e in entries]


@router.post("", response_model=LibraryEntryOut, status_code=status.HTTP_201_CREATED)
async def add_to_library(
    payload: LibraryCreateIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> LibraryEntryOut:
    user_uuid = _parse_uuid(user.id, field="user_id")

    game = await db.scalar(select(Game).where(Game.api_id == payload.api_id))
    if not game:
        data = await rawg_client.get_game(payload.api_id)
        if not data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

        artwork = await steamgriddb_client.get_artwork(data.get("title") or "")

        game = Game(
            api_id=data["api_id"],
            title=data["title"] or "Unknown",
            cover_url=data.get("cover_url"),
            grid_url=artwork.get("grid_url"),
            hero_url=artwork.get("hero_url"),
            developer=data.get("developer"),
            release_year=data.get("release_year"),
            genre=data.get("genre") or [],
            api_source=data.get("api_source") or "rawg",
        )
        db.add(game)
        await db.flush()

    entry = LibraryEntry(user_id=user_uuid, game_id=game.id, status=payload.status)
    db.add(entry)

    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already in library") from e

    if payload.share_to_feed:
        feed_post = FeedPost(user_id=user_uuid, library_entry_id=entry.id, caption=payload.caption)
        db.add(feed_post)

    await db.commit()
    await db.refresh(entry)
    entry.game = game
    return entry_to_out(entry)


@router.patch("/{entry_id}", response_model=LibraryEntryOut)
async def update_library_entry(
    entry_id: str,
    payload: LibraryUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> LibraryEntryOut:
    entry_uuid = _parse_uuid(entry_id, field="entry_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    if payload.rating is not None and not is_valid_half_star_rating(payload.rating):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rating must be between 0.5 and 5.0 in 0.5 increments",
        )

    values = {}
    if payload.status is not None:
        values["status"] = payload.status
    if payload.rating is not None:
        values["rating"] = payload.rating

    if not values:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

    values["updated_at"] = func.now()

    stmt = (
        update(LibraryEntry)
        .where(and_(LibraryEntry.id == entry_uuid, LibraryEntry.user_id == user_uuid))
        .values(**values)
        .returning(LibraryEntry.id)
    )
    updated_id = await db.scalar(stmt)
    if not updated_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    await db.commit()

    entry = await db.scalar(
        select(LibraryEntry)
        .options(selectinload(LibraryEntry.game))
        .where(LibraryEntry.id == entry_uuid)
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    return entry_to_out(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def remove_from_library(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    entry_uuid = _parse_uuid(entry_id, field="entry_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    stmt = delete(LibraryEntry).where(and_(LibraryEntry.id == entry_uuid, LibraryEntry.user_id == user_uuid))
    res = await db.execute(stmt)
    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
