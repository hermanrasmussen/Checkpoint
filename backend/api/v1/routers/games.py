from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import CurrentUser, get_current_user
from backend.db import get_db
from backend.integrations.rawg import rawg_client
from backend.integrations.steamgriddb import steamgriddb_client
from backend.models import Game
from backend.schemas import ArtworkUpdateIn, GameSummary, GridItem

router = APIRouter()


def _game_to_summary(game: Game) -> GameSummary:
    return GameSummary(
        api_id=game.api_id,
        title=game.title,
        cover_url=game.cover_url,
        grid_url=game.grid_url,
        hero_url=game.hero_url,
        developer=game.developer,
        release_year=game.release_year,
        genre=game.genre,
        api_source=game.api_source,
        steam_appid=game.steam_appid,
    )


async def _enrich_with_artwork(game: Game, db: AsyncSession) -> None:
    """Fetch SteamGridDB artwork for a game that doesn't have it yet."""
    if game.grid_url and game.hero_url:
        return
    artwork = await steamgriddb_client.get_artwork(game.title)
    changed = False
    if artwork["grid_url"] and not game.grid_url:
        game.grid_url = artwork["grid_url"]
        changed = True
    if artwork["hero_url"] and not game.hero_url:
        game.hero_url = artwork["hero_url"]
        changed = True
    if changed:
        await db.commit()


async def _backfill_steam_appid(game: Game, db: AsyncSession) -> None:
    """Fetch Steam app ID from RAWG stores if not already set."""
    if game.steam_appid is not None:
        return
    appid = await rawg_client.get_game_stores(game.api_id)
    if appid:
        game.steam_appid = appid
        await db.commit()


async def _backfill_developer(game: Game, db: AsyncSession) -> None:
    """Fetch developer from RAWG if not already set."""
    if game.developer:
        return
    data = await rawg_client.get_game(game.api_id)
    if data and data.get("developer"):
        game.developer = data["developer"]
        await db.commit()


@router.get("/search", response_model=list[GameSummary])
async def search_games(
    q: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[GameSummary]:
    results = await rawg_client.search_games(q)
    return [GameSummary(**r) for r in results]


@router.get("/{api_id}", response_model=GameSummary)
async def get_game(
    api_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> GameSummary:
    existing = await db.scalar(select(Game).where(Game.api_id == api_id))
    if existing:
        await _enrich_with_artwork(existing, db)
        await _backfill_steam_appid(existing, db)
        await _backfill_developer(existing, db)
        return _game_to_summary(existing)

    data = await rawg_client.get_game(api_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    artwork = await steamgriddb_client.get_artwork(data.get("title") or "")

    steam_appid = data.get("steam_appid")
    if steam_appid is None:
        steam_appid = await rawg_client.get_game_stores(api_id)

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
        steam_appid=steam_appid,
    )
    db.add(game)
    await db.commit()

    return _game_to_summary(game)


@router.get("/{api_id}/grids", response_model=list[GridItem])
async def get_game_grids(
    api_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[GridItem]:
    game = await db.scalar(select(Game).where(Game.api_id == api_id))
    title = game.title if game else api_id

    raw = await steamgriddb_client.get_all_grids(title)
    return [GridItem(**item) for item in raw if item.get("url")]


@router.patch("/{api_id}/artwork", response_model=GameSummary)
async def update_artwork(
    api_id: str,
    payload: ArtworkUpdateIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> GameSummary:
    game = await db.scalar(select(Game).where(Game.api_id == api_id))
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    game.grid_url = payload.grid_url
    await db.commit()

    return _game_to_summary(game)
