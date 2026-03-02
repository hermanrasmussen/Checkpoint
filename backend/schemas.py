from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


LibraryStatus = Literal["playing", "completed", "backlog", "dropped"]


class GameSummary(BaseModel):
    api_id: str
    title: str
    cover_url: Optional[str] = None
    grid_url: Optional[str] = None
    hero_url: Optional[str] = None
    developer: Optional[str] = None
    release_year: Optional[int] = None
    genre: list[str] = Field(default_factory=list)
    api_source: str = "rawg"
    steam_appid: Optional[int] = None


class LibraryEntryGame(BaseModel):
    id: str
    api_id: str
    title: str
    cover_url: Optional[str] = None
    grid_url: Optional[str] = None
    hero_url: Optional[str] = None
    developer: Optional[str] = None
    release_year: Optional[int] = None
    genre: list[str] = Field(default_factory=list)
    api_source: str


class LibraryEntryOut(BaseModel):
    id: str
    status: LibraryStatus
    rating: Optional[float] = None
    added_at: datetime
    updated_at: datetime
    game: LibraryEntryGame


class LibraryCreateIn(BaseModel):
    api_id: str
    status: LibraryStatus
    share_to_feed: bool = False
    caption: Optional[str] = None


class LibraryUpdateIn(BaseModel):
    status: Optional[LibraryStatus] = None
    rating: Optional[float] = None


class CollectionGameOut(BaseModel):
    id: str
    api_id: str
    title: str
    cover_url: Optional[str] = None
    grid_url: Optional[str] = None


class CollectionOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    game_count: int
    cover_games: list[CollectionGameOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CollectionDetailOut(CollectionOut):
    user_id: Optional[str] = None  # Set when returning for viewing (to check ownership)
    username: Optional[str] = None  # Set when returning another user's collection
    games: list[CollectionGameOut] = Field(default_factory=list)


class CollectionCreateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    game_ids: list[str] = Field(default_factory=list)


class CollectionUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)


class CollectionAddGameIn(BaseModel):
    api_id: str


class CollectionShareIn(BaseModel):
    caption: Optional[str] = Field(default=None, max_length=280)


class GridItem(BaseModel):
    id: int
    url: str
    thumb: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


class ArtworkUpdateIn(BaseModel):
    grid_url: str


class UserProfileOut(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar_id: int = 1
    steam_id: Optional[str] = None


class UserProfileUpdateIn(BaseModel):
    username: Optional[str] = None
    avatar_id: Optional[int] = Field(default=None, ge=1, le=10)


class SteamConnectIn(BaseModel):
    steam_id_or_vanity: str = Field(..., min_length=1, max_length=200)


class SteamAchievementOut(BaseModel):
    apiname: str
    name: str
    description: Optional[str] = None
    achieved: bool = False
    unlocktime: int = 0
    icon: Optional[str] = None
    icongray: Optional[str] = None


class SteamAchievementsOut(BaseModel):
    owns_game: bool = False
    achievements: list[SteamAchievementOut] = Field(default_factory=list)
    total: int = 0
    unlocked_count: int = 0


class PublicProfileOut(BaseModel):
    user_id: str
    username: Optional[str] = None
    avatar_id: int = 1
    library: list[LibraryEntryOut] = Field(default_factory=list)
    collections: list[CollectionOut] = Field(default_factory=list)
    follower_count: int = 0
    following_count: int = 0
    is_followed_by_me: bool = False


class StatsOut(BaseModel):
    total: int
    by_status: dict[LibraryStatus, int]
    average_rating: Optional[float] = None
    recent: list[LibraryEntryOut]


class FeedCommentOut(BaseModel):
    id: str
    post_id: str
    user_id: str
    username: Optional[str] = None
    avatar_id: int = 1
    body: str
    created_at: datetime


class FeedPostOut(BaseModel):
    id: str
    user_id: str
    username: Optional[str] = None
    avatar_id: int = 1
    caption: Optional[str] = None
    created_at: datetime
    post_type: str = "library_entry"
    library_entry: Optional[LibraryEntryOut] = None
    collection: Optional[CollectionOut] = None
    upvote_count: int = 0
    comment_count: int = 0
    upvoted_by_me: bool = False


class FeedPostCreateIn(BaseModel):
    library_entry_id: str
    caption: Optional[str] = None


class FeedCommentCreateIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=500)

