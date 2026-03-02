from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

STEAM_API_BASE = "https://api.steampowered.com"


class SteamClient:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.steam_api_key

    async def resolve_vanity_url(self, vanity: str) -> Optional[str]:
        """Resolve a Steam vanity URL name to a Steam ID 64."""
        if not self.api_key or not vanity:
            return None
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v0001/",
                    params={"key": self.api_key, "vanityurl": vanity},
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
            response = data.get("response", {})
            if response.get("success") == 1:
                return response.get("steamid")
            return None
        except Exception:
            logger.debug("Steam resolve vanity failed for %r", vanity, exc_info=True)
            return None

    async def get_owned_games(self, steam_id: str, appids_filter: List[int] | None = None) -> List[int]:
        """Return list of appids owned by this user (optionally filtered)."""
        if not self.api_key or not steam_id:
            return []
        try:
            params: Dict[str, Any] = {
                "key": self.api_key,
                "steamid": steam_id,
                "format": "json",
                "include_played_free_games": "true",
            }
            if appids_filter:
                for i, appid in enumerate(appids_filter):
                    params[f"appids_filter[{i}]"] = appid

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/",
                    params=params,
                )
                if resp.status_code != 200:
                    return []
                data = resp.json()
            games = data.get("response", {}).get("games", [])
            return [g["appid"] for g in games if "appid" in g]
        except Exception:
            logger.debug("Steam get_owned_games failed for %s", steam_id, exc_info=True)
            return []

    async def get_owned_games_with_names(self, steam_id: str) -> List[Dict[str, Any]]:
        """Return list of {appid, name} for games owned by this user. Requires include_appinfo."""
        if not self.api_key or not steam_id:
            return []
        try:
            params: Dict[str, Any] = {
                "key": self.api_key,
                "steamid": steam_id,
                "format": "json",
                "include_played_free_games": "true",
                "include_appinfo": "true",
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/",
                    params=params,
                )
                if resp.status_code != 200:
                    return []
                data = resp.json()
            games = data.get("response", {}).get("games", [])
            return [{"appid": g["appid"], "name": g.get("name") or ""} for g in games if "appid" in g]
        except Exception:
            logger.debug("Steam get_owned_games_with_names failed for %s", steam_id, exc_info=True)
            return []

    def find_appid_by_title(self, game_title: str, owned_with_names: List[Dict[str, Any]]) -> Optional[int]:
        """Find Steam appid for a game by matching RAWG title against owned games. Returns first match or None."""
        if not game_title or not owned_with_names:
            return None

        def normalize(s: str) -> str:
            s = (s or "").lower().strip()
            s = re.sub(r"[™®©º°]", "", s)
            return " ".join(s.split())

        n_title = normalize(game_title)
        if len(n_title) < 3:
            return None

        def matches(a: str, b: str) -> bool:
            if a == b:
                return True
            if len(a) >= 6 and a in b:
                return True
            if len(b) >= 6 and b in a:
                return True
            if len(a) >= 8 and b.startswith(a):
                return True
            if len(b) >= 8 and a.startswith(b):
                return True
            return False

        for g in owned_with_names:
            steam_name = (g.get("name") or "").strip()
            n_steam = normalize(steam_name)
            if not n_steam:
                continue
            if matches(n_title, n_steam):
                return g["appid"]

        return None

    async def get_achievement_schema(self, appid: int) -> Optional[Dict[str, Dict[str, str]]]:
        """Fetch achievement schema (icons) for a game. Returns dict of apiname -> {icon, icongray}."""
        if not self.api_key:
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/",
                    params={
                        "key": self.api_key,
                        "appid": appid,
                        "l": "english",
                    },
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
            game = data.get("game", {})
            achievements = game.get("availableGameStats", {}).get("achievements", [])
            result: Dict[str, Dict[str, str]] = {}
            for a in achievements:
                name = a.get("name")
                if name:
                    icon = a.get("icon") or ""
                    icongray = a.get("icongray") or ""
                    if icon and not icon.startswith("http"):
                        icon = f"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appid}/{icon}.jpg"
                    if icongray and not icongray.startswith("http"):
                        icongray = f"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appid}/{icongray}.jpg"
                    result[name] = {"icon": icon, "icongray": icongray}
            return result
        except Exception:
            logger.debug("Steam get_achievement_schema failed for appid %s", appid, exc_info=True)
            return None

    async def get_player_achievements(self, steam_id: str, appid: int) -> Optional[Dict[str, Any]]:
        """Fetch achievements for a player+game. Returns dict with gameName and achievements list, or None on error."""
        if not self.api_key or not steam_id:
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/",
                    params={
                        "key": self.api_key,
                        "steamid": steam_id,
                        "appid": appid,
                        "l": "english",
                    },
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
            playerstats = data.get("playerstats", {})
            if not playerstats.get("success"):
                return None
            return {
                "game_name": playerstats.get("gameName", ""),
                "achievements": playerstats.get("achievements", []),
            }
        except Exception:
            logger.debug("Steam get_player_achievements failed for %s/%s", steam_id, appid, exc_info=True)
            return None

    def parse_steam_input(self, raw_input: str) -> tuple[str, str]:
        """Parse user input into (type, value). Type is 'steamid' or 'vanity'."""
        raw = raw_input.strip().rstrip("/")

        profiles_match = re.search(r"steamcommunity\.com/profiles/(\d{17})", raw)
        if profiles_match:
            return ("steamid", profiles_match.group(1))

        id_match = re.search(r"steamcommunity\.com/id/([^/]+)", raw)
        if id_match:
            return ("vanity", id_match.group(1))

        if re.fullmatch(r"\d{17}", raw):
            return ("steamid", raw)

        return ("vanity", raw)


steam_client = SteamClient()
