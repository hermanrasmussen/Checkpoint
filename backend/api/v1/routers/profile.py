from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.v1.utils import collection_to_out, entry_to_out
from backend.auth import CurrentUser, get_current_user
from backend.db import get_db
from backend.models import Collection, CollectionItem, Follow, Game, LibraryEntry, UserProfile
from backend.schemas import (
    PublicProfileOut,
    UserProfileOut,
    UserProfileUpdateIn,
)

router = APIRouter()


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid {field}") from e


@router.get("/me", response_model=UserProfileOut)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> UserProfileOut:
    user_uuid = _parse_uuid(user.id, field="user_id")
    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user_uuid))

    if not profile:
        profile = UserProfile(user_id=user_uuid, avatar_id=1)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return UserProfileOut(
        user_id=str(profile.user_id),
        username=profile.username,
        avatar_id=profile.avatar_id,
        steam_id=profile.steam_id,
    )


@router.patch("/me", response_model=UserProfileOut)
async def update_my_profile(
    payload: UserProfileUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> UserProfileOut:
    user_uuid = _parse_uuid(user.id, field="user_id")
    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user_uuid))

    if not profile:
        profile = UserProfile(user_id=user_uuid, avatar_id=1)
        db.add(profile)
        await db.flush()

    if payload.username is not None:
        if len(payload.username.strip()) < 2:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Username must be at least 2 characters")
        if len(payload.username.strip()) > 30:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Username must be at most 30 characters")
        existing = await db.scalar(
            select(UserProfile).where(
                UserProfile.username == payload.username.strip(),
                UserProfile.user_id != user_uuid,
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        profile.username = payload.username.strip()

    if payload.avatar_id is not None:
        profile.avatar_id = payload.avatar_id

    await db.commit()
    await db.refresh(profile)

    return UserProfileOut(
        user_id=str(profile.user_id),
        username=profile.username,
        avatar_id=profile.avatar_id,
        steam_id=profile.steam_id,
    )


@router.get("/search", response_model=list[UserProfileOut])
async def search_users(
    q: str = "",
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[UserProfileOut]:
    if len(q.strip()) < 2:
        return []
    pattern = f"%{q.strip()}%"
    stmt = (
        select(UserProfile)
        .where(UserProfile.username.ilike(pattern))
        .limit(limit)
    )
    profiles = (await db.scalars(stmt)).all()
    return [
        UserProfileOut(user_id=str(p.user_id), username=p.username, avatar_id=p.avatar_id)
        for p in profiles
    ]


@router.post("/{user_id}/follow")
async def toggle_follow(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    user_uuid = _parse_uuid(user.id, field="user_id")
    target_uuid = _parse_uuid(user_id, field="user_id")
    if user_uuid == target_uuid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")

    existing = await db.scalar(
        select(Follow).where(
            and_(Follow.follower_id == user_uuid, Follow.following_id == target_uuid)
        )
    )
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"following": False}
    db.add(Follow(follower_id=user_uuid, following_id=target_uuid))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"following": True}


@router.get("/{user_id}", response_model=PublicProfileOut)
async def get_public_profile(
    user_id: str,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    sort: str = Query(default="date_added"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> PublicProfileOut:
    user_uuid = _parse_uuid(user.id, field="user_id")
    target_uuid = _parse_uuid(user_id, field="user_id")
    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == target_uuid))

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    follower_count = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.following_id == target_uuid)
    )
    following_count = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == target_uuid)
    )
    is_followed_by_me = False
    if user_uuid != target_uuid:
        is_followed = await db.scalar(
            select(Follow).where(
                and_(Follow.follower_id == user_uuid, Follow.following_id == target_uuid)
            )
        )
        is_followed_by_me = is_followed is not None

    stmt = (
        select(LibraryEntry)
        .join(LibraryEntry.game)
        .options(selectinload(LibraryEntry.game))
        .where(LibraryEntry.user_id == target_uuid)
    )

    if status_filter:
        stmt = stmt.where(LibraryEntry.status == status_filter)

    if sort == "date_added":
        stmt = stmt.order_by(LibraryEntry.added_at.desc())
    elif sort == "rating":
        stmt = stmt.order_by(LibraryEntry.rating.desc().nullslast(), LibraryEntry.added_at.desc())
    elif sort == "release_year":
        stmt = stmt.order_by(Game.release_year.desc().nullslast(), LibraryEntry.added_at.desc())
    elif sort == "title":
        stmt = stmt.order_by(Game.title.asc())
    else:
        stmt = stmt.order_by(LibraryEntry.added_at.desc())

    stmt = stmt.offset(offset).limit(limit)
    res = await db.scalars(stmt)
    entries = res.unique().all()

    collections_stmt = (
        select(Collection)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game))
        .where(Collection.user_id == target_uuid)
        .order_by(Collection.updated_at.desc())
    )
    collections = (await db.scalars(collections_stmt)).unique().all()

    return PublicProfileOut(
        user_id=str(profile.user_id),
        username=profile.username,
        avatar_id=profile.avatar_id,
        library=[entry_to_out(e) for e in entries],
        collections=[collection_to_out(c) for c in collections],
        follower_count=int(follower_count or 0),
        following_count=int(following_count or 0),
        is_followed_by_me=is_followed_by_me,
    )
