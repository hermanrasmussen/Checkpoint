from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import Enum as SAEnum, Numeric


class Base(DeclarativeBase):
    pass


class Game(Base):
    __tablename__ = "games"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    grid_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    developer: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_year: Mapped[int | None] = mapped_column(nullable=True)
    genre: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    api_source: Mapped[str] = mapped_column(Text, nullable=False, default="rawg")
    steam_appid: Mapped[int | None] = mapped_column(nullable=True)

    library_entries: Mapped[list["LibraryEntry"]] = relationship(back_populates="game")
    collection_items: Mapped[list["CollectionItem"]] = relationship(back_populates="game")


LibraryStatus = SAEnum(
    "playing",
    "completed",
    "backlog",
    "dropped",
    name="library_status",
)


class LibraryEntry(Base):
    __tablename__ = "library_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)

    status: Mapped[str] = mapped_column(LibraryStatus, nullable=False, default="backlog")
    rating: Mapped[float | None] = mapped_column(Numeric(2, 1), nullable=True)

    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    game: Mapped[Game] = relationship(back_populates="library_entries")


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    items: Mapped[list["CollectionItem"]] = relationship(
        back_populates="collection", order_by="CollectionItem.position", cascade="all, delete-orphan"
    )


class CollectionItem(Base):
    __tablename__ = "collection_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collections.id", ondelete="CASCADE"), nullable=False
    )
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(nullable=False, default=0)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    collection: Mapped[Collection] = relationship(back_populates="items")
    game: Mapped[Game] = relationship(back_populates="collection_items")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    username: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True)
    avatar_id: Mapped[int] = mapped_column(nullable=False, default=1)
    steam_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Follow(Base):
    __tablename__ = "follows"

    follower_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    following_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class FeedPost(Base):
    __tablename__ = "feed_posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    post_type: Mapped[str] = mapped_column(String(32), nullable=False, default="library_entry")
    library_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("library_entries.id", ondelete="CASCADE"), nullable=True, unique=True,
    )
    collection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collections.id", ondelete="CASCADE"), nullable=True, unique=True,
    )
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    library_entry: Mapped[LibraryEntry | None] = relationship(lazy="joined")
    collection: Mapped["Collection | None"] = relationship(lazy="joined")
    upvotes: Mapped[list["FeedUpvote"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    comments: Mapped[list["FeedComment"]] = relationship(back_populates="post", cascade="all, delete-orphan")


class FeedUpvote(Base):
    __tablename__ = "feed_upvotes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("feed_posts.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    post: Mapped[FeedPost] = relationship(back_populates="upvotes")


class FeedComment(Base):
    __tablename__ = "feed_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("feed_posts.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    post: Mapped[FeedPost] = relationship(back_populates="comments")


Index("idx_games_api_id", Game.api_id)
Index("idx_library_entries_user", LibraryEntry.user_id)
Index("idx_library_entries_game", LibraryEntry.game_id)
Index("idx_library_entries_user_game", LibraryEntry.user_id, LibraryEntry.game_id, unique=True)
Index("idx_feed_posts_created", FeedPost.created_at.desc())
Index("idx_feed_posts_user", FeedPost.user_id)
Index("idx_feed_upvotes_post", FeedUpvote.post_id)
Index("idx_feed_comments_post", FeedComment.post_id, FeedComment.created_at)
Index("idx_follows_follower", Follow.follower_id)
Index("idx_follows_following", Follow.following_id)
Index("idx_collections_user", Collection.user_id)
Index("idx_collection_items_collection", CollectionItem.collection_id)

