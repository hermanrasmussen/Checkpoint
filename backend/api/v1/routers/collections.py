from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import and_, delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.v1.utils import collection_to_out, collection_to_detail_out, collection_game_to_out
from backend.auth import CurrentUser, get_current_user
from backend.db import get_db
from backend.integrations.rawg import rawg_client
from backend.integrations.steamgriddb import steamgriddb_client
from backend.models import Collection, CollectionItem, FeedPost, Game, LibraryEntry, UserProfile
from backend.schemas import (
    CollectionAddGameIn,
    CollectionCreateIn,
    CollectionDetailOut,
    CollectionOut,
    CollectionShareIn,
    CollectionUpdateIn,
)

router = APIRouter()


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid {field}") from e


async def _get_or_create_game(db: AsyncSession, api_id: str) -> Game:
    game = await db.scalar(select(Game).where(Game.api_id == api_id))
    if game:
        return game
    data = await rawg_client.get_game(api_id)
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
    return game


@router.get("", response_model=list[CollectionOut])
async def list_collections(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[CollectionOut]:
    user_uuid = _parse_uuid(user.id, field="user_id")
    stmt = (
        select(Collection)
        .where(Collection.user_id == user_uuid)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game))
        .order_by(Collection.updated_at.desc())
    )
    collections = (await db.scalars(stmt)).unique().all()
    return [collection_to_out(c) for c in collections]


@router.post("", response_model=CollectionDetailOut, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreateIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CollectionDetailOut:
    user_uuid = _parse_uuid(user.id, field="user_id")

    collection = Collection(user_id=user_uuid, name=payload.name.strip(), description=payload.description.strip() if payload.description else None)
    db.add(collection)
    await db.flush()

    for pos, api_id in enumerate(payload.game_ids):
        game = await _get_or_create_game(db, api_id)
        item = CollectionItem(collection_id=collection.id, game_id=game.id, position=pos)
        db.add(item)

    await db.commit()
    await db.refresh(collection)
    await db.refresh(collection, ["items"])
    for item in collection.items:
        await db.refresh(item, ["game"])
    return collection_to_detail_out(collection)


@router.get("/{collection_id}", response_model=CollectionDetailOut)
async def get_collection(
    collection_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CollectionDetailOut:
    coll_uuid = _parse_uuid(collection_id, field="collection_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    collection = await db.scalar(
        select(Collection)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game))
        .where(Collection.id == coll_uuid)
    )
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    username = None
    if collection.user_id != user_uuid:
        owner = await db.scalar(select(UserProfile).where(UserProfile.user_id == collection.user_id))
        username = owner.username if owner else None

    return collection_to_detail_out(collection, username=username)


@router.patch("/{collection_id}", response_model=CollectionDetailOut)
async def update_collection(
    collection_id: str,
    payload: CollectionUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CollectionDetailOut:
    coll_uuid = _parse_uuid(collection_id, field="collection_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    values = {}
    if payload.name is not None:
        values["name"] = payload.name.strip()
    if payload.description is not None:
        values["description"] = payload.description.strip() if payload.description else None

    if not values:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

    res = await db.execute(
        update(Collection).where(and_(Collection.id == coll_uuid, Collection.user_id == user_uuid)).values(**values)
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    await db.commit()

    collection = await db.scalar(
        select(Collection)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game))
        .where(Collection.id == coll_uuid)
    )
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    return collection_to_detail_out(collection)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_collection(
    collection_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    coll_uuid = _parse_uuid(collection_id, field="collection_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    res = await db.execute(delete(Collection).where(and_(Collection.id == coll_uuid, Collection.user_id == user_uuid)))
    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{collection_id}/games", response_model=CollectionDetailOut)
async def add_game_to_collection(
    collection_id: str,
    payload: CollectionAddGameIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CollectionDetailOut:
    coll_uuid = _parse_uuid(collection_id, field="collection_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    collection = await db.scalar(
        select(Collection)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game))
        .where(and_(Collection.id == coll_uuid, Collection.user_id == user_uuid))
    )
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    game = await _get_or_create_game(db, payload.api_id)

    max_pos = 0
    for item in collection.items:
        if item.position >= max_pos:
            max_pos = item.position + 1

    item = CollectionItem(collection_id=collection.id, game_id=game.id, position=max_pos)
    db.add(item)
    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Game already in collection") from e

    await db.commit()
    await db.refresh(collection)
    await db.refresh(collection, ["items"])
    for it in collection.items:
        await db.refresh(it, ["game"])
    return collection_to_detail_out(collection)


@router.delete("/{collection_id}/games/{api_id}", response_model=CollectionDetailOut)
async def remove_game_from_collection(
    collection_id: str,
    api_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CollectionDetailOut:
    coll_uuid = _parse_uuid(collection_id, field="collection_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    game = await db.scalar(select(Game).where(Game.api_id == api_id))
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not in collection")

    collection = await db.scalar(
        select(Collection)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game))
        .where(and_(Collection.id == coll_uuid, Collection.user_id == user_uuid))
    )
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    res = await db.execute(
        delete(CollectionItem).where(
            and_(CollectionItem.collection_id == coll_uuid, CollectionItem.game_id == game.id)
        )
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not in collection")

    await db.commit()
    await db.refresh(collection)
    await db.refresh(collection, ["items"])
    for it in collection.items:
        await db.refresh(it, ["game"])
    return collection_to_detail_out(collection)


@router.post("/{collection_id}/share", response_model=dict)
async def share_collection_to_feed(
    collection_id: str,
    payload: CollectionShareIn = CollectionShareIn(),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    coll_uuid = _parse_uuid(collection_id, field="collection_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    collection = await db.scalar(
        select(Collection)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game))
        .where(and_(Collection.id == coll_uuid, Collection.user_id == user_uuid))
    )
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    if not collection.items:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cannot share empty collection")

    post = FeedPost(
        user_id=user_uuid,
        post_type="collection",
        collection_id=coll_uuid,
        caption=payload.caption.strip() if payload.caption else None,
    )
    db.add(post)
    await db.flush()
    post_id = post.id
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Collection already shared to feed") from e

    return {"post_id": str(post_id)}
