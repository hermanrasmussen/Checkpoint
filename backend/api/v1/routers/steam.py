from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import CurrentUser, get_current_user
from backend.db import get_db
from backend.integrations.steam import steam_client
from backend.models import Game, UserProfile
from backend.schemas import SteamAchievementOut, SteamAchievementsOut, SteamConnectIn

router = APIRouter()
logger = logging.getLogger(__name__)


def _parse_uuid(value: str, *, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid {field}") from e


@router.post("/connect")
async def connect_steam(
    payload: SteamConnectIn,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    user_uuid = _parse_uuid(user.id, field="user_id")

    input_type, value = steam_client.parse_steam_input(payload.steam_id_or_vanity)

    if input_type == "vanity":
        resolved = await steam_client.resolve_vanity_url(value)
        if not resolved:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Could not find Steam profile. Check the URL or username.")
        steam_id = resolved
    else:
        steam_id = value

    owned = await steam_client.get_owned_games(steam_id, appids_filter=[440])
    if owned is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Steam profile appears to be private. Set your game details to public in Steam privacy settings.")

    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user_uuid))
    if not profile:
        profile = UserProfile(user_id=user_uuid, avatar_id=1)
        db.add(profile)
        await db.flush()

    profile.steam_id = steam_id
    await db.commit()
    await db.refresh(profile)

    return {"steam_id": profile.steam_id}


@router.get("/achievements", response_model=SteamAchievementsOut)
async def get_achievements(
    api_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SteamAchievementsOut:
    user_uuid = _parse_uuid(user.id, field="user_id")

    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user_uuid))
    if not profile or not profile.steam_id:
        return SteamAchievementsOut(owns_game=False)

    game = await db.scalar(select(Game).where(Game.api_id == api_id))
    if not game:
        return SteamAchievementsOut(owns_game=False)

    appid: int | None = None

    if game.steam_appid:
        owned_appids = await steam_client.get_owned_games(
            profile.steam_id, appids_filter=[game.steam_appid]
        )
        if game.steam_appid in owned_appids:
            appid = game.steam_appid

    if not appid and game.title:
        owned_with_names = await steam_client.get_owned_games_with_names(profile.steam_id)
        appid = steam_client.find_appid_by_title(game.title, owned_with_names)

    if not appid:
        logger.debug("Steam achievements: no appid for game %r (title=%r, steam_appid=%s)", api_id, game.title, game.steam_appid)
        return SteamAchievementsOut(owns_game=False)

    result = await steam_client.get_player_achievements(profile.steam_id, appid)
    if not result:
        return SteamAchievementsOut(owns_game=True)

    schema = await steam_client.get_achievement_schema(appid)
    schema_map = schema or {}

    achievements: list[SteamAchievementOut] = []
    unlocked = 0
    for a in result.get("achievements", []):
        achieved = bool(a.get("achieved", 0))
        if achieved:
            unlocked += 1
        apiname = a.get("apiname", a.get("name", ""))
        icons = schema_map.get(apiname, {})
        achievements.append(
            SteamAchievementOut(
                apiname=apiname,
                name=a.get("name", a.get("apiname", "")),
                description=a.get("description") or None,
                achieved=achieved,
                unlocktime=a.get("unlocktime", 0),
                icon=icons.get("icon") or None,
                icongray=icons.get("icongray") or None,
            )
        )

    return SteamAchievementsOut(
        owns_game=True,
        achievements=achievements,
        total=len(achievements),
        unlocked_count=unlocked,
    )
