from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://www.steamgriddb.com/api/v2"


class SteamGridDBClient:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.steamgriddb_api_key

    @property
    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    async def search_game(self, name: str) -> Optional[int]:
        """Search SteamGridDB by game name, return the best-match game ID."""
        if not self.api_key or not name:
            return None

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(
                    f"{BASE_URL}/search/autocomplete/{name}",
                    headers=self._headers,
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()

            results = data.get("data", [])
            if not results:
                return None
            return results[0].get("id")
        except Exception:
            logger.debug("SteamGridDB search failed for %r", name, exc_info=True)
            return None

    async def get_grid(self, game_id: int) -> Optional[str]:
        """Get the best vertical grid (cover art) URL for a game."""
        if not self.api_key:
            return None

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(
                    f"{BASE_URL}/grids/game/{game_id}",
                    headers=self._headers,
                    params={"dimensions": "600x900", "types": "static"},
                )
                if resp.status_code != 200:
                    resp = await client.get(
                        f"{BASE_URL}/grids/game/{game_id}",
                        headers=self._headers,
                        params={"types": "static"},
                    )
                    if resp.status_code != 200:
                        return None
                data = resp.json()

            items = data.get("data", [])
            if not items:
                return None
            return items[0].get("url") or items[0].get("thumb")
        except Exception:
            logger.debug("SteamGridDB grid fetch failed for %s", game_id, exc_info=True)
            return None

    async def get_hero(self, game_id: int) -> Optional[str]:
        """Get the best hero (wide banner) URL for a game."""
        if not self.api_key:
            return None

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(
                    f"{BASE_URL}/heroes/game/{game_id}",
                    headers=self._headers,
                    params={"types": "static"},
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()

            items = data.get("data", [])
            if not items:
                return None
            return items[0].get("url") or items[0].get("thumb")
        except Exception:
            logger.debug("SteamGridDB hero fetch failed for %s", game_id, exc_info=True)
            return None

    async def get_all_grids(self, game_name: str) -> List[Dict[str, Any]]:
        """Search for a game and return all available grid images."""
        sgdb_id = await self.search_game(game_name)
        if not sgdb_id:
            return []

        if not self.api_key:
            return []

        try:
            items: List[Dict[str, Any]] = []
            async with httpx.AsyncClient(timeout=8.0) as client:
                for dims in ("600x900", None):
                    params: Dict[str, str] = {"types": "static"}
                    if dims:
                        params["dimensions"] = dims
                    resp = await client.get(
                        f"{BASE_URL}/grids/game/{sgdb_id}",
                        headers=self._headers,
                        params=params,
                    )
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                    for item in data.get("data", []):
                        items.append({
                            "id": item.get("id"),
                            "url": item.get("url"),
                            "thumb": item.get("thumb"),
                            "width": item.get("width"),
                            "height": item.get("height"),
                        })

            seen_ids: set[int] = set()
            unique: List[Dict[str, Any]] = []
            for item in items:
                if item["id"] not in seen_ids:
                    seen_ids.add(item["id"])
                    unique.append(item)
            return unique
        except Exception:
            logger.debug("SteamGridDB get_all_grids failed for %r", game_name, exc_info=True)
            return []

    async def get_artwork(self, game_name: str) -> Dict[str, Optional[str]]:
        """Search for a game and fetch grid + hero art in one call."""
        sgdb_id = await self.search_game(game_name)
        if not sgdb_id:
            return {"grid_url": None, "hero_url": None}

        grid_url, hero_url = await asyncio.gather(
            self.get_grid(sgdb_id),
            self.get_hero(sgdb_id),
        )
        return {"grid_url": grid_url, "hero_url": hero_url}


steamgriddb_client = SteamGridDBClient()
