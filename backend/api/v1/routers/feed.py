from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.v1.utils import collection_to_out, entry_to_out
from backend.auth import CurrentUser, get_current_user
from backend.db import get_db
from backend.models import (
    Collection,
    CollectionItem,
    FeedComment,
    FeedPost,
    FeedUpvote,
    LibraryEntry,
    UserProfile,
)
from backend.schemas import (
    FeedCommentCreateIn,
    FeedCommentOut,
    FeedPostCreateIn,
    FeedPostOut,
)

router = APIRouter()


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid {field}") from e


def _build_post_out(
    post: FeedPost,
    profile: UserProfile | None,
    upvote_count: int,
    comment_count: int,
    upvoted_by_me: bool,
) -> FeedPostOut:
    library_entry_out = None
    collection_out = None
    if post.post_type == "collection" and post.collection:
        collection_out = collection_to_out(post.collection)
    elif post.library_entry:
        library_entry_out = entry_to_out(post.library_entry)

    return FeedPostOut(
        id=str(post.id),
        user_id=str(post.user_id),
        username=profile.username if profile else None,
        avatar_id=profile.avatar_id if profile else 1,
        caption=post.caption,
        created_at=post.created_at,
        post_type=post.post_type or "library_entry",
        library_entry=library_entry_out,
        collection=collection_out,
        upvote_count=upvote_count,
        comment_count=comment_count,
        upvoted_by_me=upvoted_by_me,
    )


@router.get("", response_model=list[FeedPostOut])
async def get_feed(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
    feed_filter: str = Query(default="all", alias="filter"),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[FeedPostOut]:
    from backend.models import Follow

    user_uuid = _parse_uuid(user.id, field="user_id")

    stmt = (
        select(FeedPost)
        .options(
            selectinload(FeedPost.library_entry).selectinload(LibraryEntry.game),
            selectinload(FeedPost.collection).selectinload(Collection.items).selectinload(CollectionItem.game),
        )
        .order_by(FeedPost.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if feed_filter == "following":
        subq = select(Follow.following_id).where(Follow.follower_id == user_uuid)
        stmt = stmt.where(FeedPost.user_id.in_(subq))

    posts = (await db.scalars(stmt)).unique().all()

    if not posts:
        return []

    post_ids = [p.id for p in posts]
    user_ids = list({p.user_id for p in posts})

    upvote_counts = dict(
        (await db.execute(
            select(FeedUpvote.post_id, func.count())
            .where(FeedUpvote.post_id.in_(post_ids))
            .group_by(FeedUpvote.post_id)
        )).all()
    )

    comment_counts = dict(
        (await db.execute(
            select(FeedComment.post_id, func.count())
            .where(FeedComment.post_id.in_(post_ids))
            .group_by(FeedComment.post_id)
        )).all()
    )

    my_upvotes = set(
        (await db.scalars(
            select(FeedUpvote.post_id)
            .where(and_(FeedUpvote.post_id.in_(post_ids), FeedUpvote.user_id == user_uuid))
        )).all()
    )

    profiles = {
        p.user_id: p
        for p in (await db.scalars(
            select(UserProfile).where(UserProfile.user_id.in_(user_ids))
        )).all()
    }

    return [
        _build_post_out(
            post=p,
            profile=profiles.get(p.user_id),
            upvote_count=upvote_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            upvoted_by_me=p.id in my_upvotes,
        )
        for p in posts
    ]


@router.post("", response_model=FeedPostOut, status_code=status.HTTP_201_CREATED)
async def create_feed_post(
    payload: FeedPostCreateIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> FeedPostOut:
    user_uuid = _parse_uuid(user.id, field="user_id")
    entry_uuid = _parse_uuid(payload.library_entry_id, field="library_entry_id")

    entry = await db.scalar(
        select(LibraryEntry)
        .options(selectinload(LibraryEntry.game))
        .where(and_(LibraryEntry.id == entry_uuid, LibraryEntry.user_id == user_uuid))
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library entry not found")

    post = FeedPost(user_id=user_uuid, library_entry_id=entry_uuid, caption=payload.caption)
    db.add(post)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already shared to feed") from e

    await db.refresh(post)
    post.library_entry = entry

    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user_uuid))
    return _build_post_out(post, profile, 0, 0, False)


# Static-prefix routes MUST come before /{post_id} to avoid shadowing
@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    comment_uuid = _parse_uuid(comment_id, field="comment_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    res = await db.execute(
        delete(FeedComment).where(and_(FeedComment.id == comment_uuid, FeedComment.user_id == user_uuid))
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_feed_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    post_uuid = _parse_uuid(post_id, field="post_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    res = await db.execute(
        delete(FeedPost).where(and_(FeedPost.id == post_uuid, FeedPost.user_id == user_uuid))
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{post_id}/upvote", status_code=status.HTTP_200_OK)
async def toggle_upvote(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    post_uuid = _parse_uuid(post_id, field="post_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    post_exists = await db.scalar(select(FeedPost.id).where(FeedPost.id == post_uuid))
    if not post_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing = await db.scalar(
        select(FeedUpvote).where(and_(FeedUpvote.post_id == post_uuid, FeedUpvote.user_id == user_uuid))
    )

    if existing:
        await db.delete(existing)
        await db.commit()
        upvoted = False
    else:
        db.add(FeedUpvote(post_id=post_uuid, user_id=user_uuid))
        await db.commit()
        upvoted = True

    count = await db.scalar(
        select(func.count()).select_from(FeedUpvote).where(FeedUpvote.post_id == post_uuid)
    )
    return {"upvoted": upvoted, "upvote_count": count or 0}


@router.get("/{post_id}/comments", response_model=list[FeedCommentOut])
async def get_comments(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[FeedCommentOut]:
    post_uuid = _parse_uuid(post_id, field="post_id")

    comments = (await db.scalars(
        select(FeedComment)
        .where(FeedComment.post_id == post_uuid)
        .order_by(FeedComment.created_at.asc())
    )).all()

    if not comments:
        return []

    user_ids = list({c.user_id for c in comments})
    profiles = {
        p.user_id: p
        for p in (await db.scalars(
            select(UserProfile).where(UserProfile.user_id.in_(user_ids))
        )).all()
    }

    return [
        FeedCommentOut(
            id=str(c.id),
            post_id=str(c.post_id),
            user_id=str(c.user_id),
            username=profiles[c.user_id].username if c.user_id in profiles else None,
            avatar_id=profiles[c.user_id].avatar_id if c.user_id in profiles else 1,
            body=c.body,
            created_at=c.created_at,
        )
        for c in comments
    ]


@router.post("/{post_id}/comments", response_model=FeedCommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    post_id: str,
    payload: FeedCommentCreateIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> FeedCommentOut:
    post_uuid = _parse_uuid(post_id, field="post_id")
    user_uuid = _parse_uuid(user.id, field="user_id")

    post_exists = await db.scalar(select(FeedPost.id).where(FeedPost.id == post_uuid))
    if not post_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    comment = FeedComment(post_id=post_uuid, user_id=user_uuid, body=payload.body)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user_uuid))
    return FeedCommentOut(
        id=str(comment.id),
        post_id=str(comment.post_id),
        user_id=str(comment.user_id),
        username=profile.username if profile else None,
        avatar_id=profile.avatar_id if profile else 1,
        body=comment.body,
        created_at=comment.created_at,
    )
