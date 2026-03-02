from __future__ import annotations

from backend.models import Collection, LibraryEntry
from backend.schemas import (
    CollectionDetailOut,
    CollectionGameOut,
    CollectionOut,
    LibraryEntryGame,
    LibraryEntryOut,
)


def collection_game_to_out(game) -> CollectionGameOut:
    return CollectionGameOut(
        id=str(game.id),
        api_id=game.api_id,
        title=game.title,
        cover_url=game.cover_url,
        grid_url=game.grid_url,
    )


def collection_to_out(collection: Collection) -> CollectionOut:
    items = sorted(collection.items, key=lambda x: x.position)
    cover_games = [collection_game_to_out(item.game) for item in items[:4]]
    return CollectionOut(
        id=str(collection.id),
        name=collection.name,
        description=collection.description,
        game_count=len(collection.items),
        cover_games=cover_games,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


def collection_to_detail_out(
    collection: Collection,
    *,
    user_id: str | None = None,
    username: str | None = None,
) -> CollectionDetailOut:
    base = collection_to_out(collection)
    items = sorted(collection.items, key=lambda x: x.position)
    games = [collection_game_to_out(item.game) for item in items]
    return CollectionDetailOut(
        id=base.id,
        name=base.name,
        description=base.description,
        game_count=base.game_count,
        cover_games=base.cover_games,
        created_at=base.created_at,
        updated_at=base.updated_at,
        user_id=user_id or str(collection.user_id),
        username=username,
        games=games,
    )


def entry_to_out(entry: LibraryEntry) -> LibraryEntryOut:
    g = entry.game
    return LibraryEntryOut(
        id=str(entry.id),
        status=entry.status,  # type: ignore[arg-type]
        rating=float(entry.rating) if entry.rating is not None else None,
        added_at=entry.added_at,
        updated_at=entry.updated_at,
        game=LibraryEntryGame(
            id=str(g.id),
            api_id=g.api_id,
            title=g.title,
            cover_url=g.cover_url,
            grid_url=g.grid_url,
            hero_url=g.hero_url,
            developer=g.developer,
            release_year=g.release_year,
            genre=g.genre,
            api_source=g.api_source,
        ),
    )
