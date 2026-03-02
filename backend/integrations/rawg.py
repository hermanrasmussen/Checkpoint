from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx

from backend.config import settings


class RawgClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None) -> None:
        self.api_key = api_key or settings.rawg_api_key
        self.base_url = base_url or settings.rawg_base_url.rstrip("/")

    async def search_games(self, query: str, page_size: int = 20) -> List[Dict[str, Any]]:
        if not self.api_key:
            raise RuntimeError("RAWG API key is not configured (set RAWG_API_KEY).")
        if not query:
            return []

        params = {
            "search": query,
            "page_size": page_size,
            "key": self.api_key,
        }

        async with httpx.AsyncClient(base_url=self.base_url, timeout=10.0) as client:
            resp = await client.get("/games", params=params)
            resp.raise_for_status()
            data = resp.json()

        results: List[Dict[str, Any]] = []
        for item in data.get("results", []):
            results.append(self._map_game_summary(item))
        return results

    async def get_game(self, api_id: str) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            raise RuntimeError("RAWG API key is not configured (set RAWG_API_KEY).")
        if not api_id:
            return None

        params = {"key": self.api_key}
        async with httpx.AsyncClient(base_url=self.base_url, timeout=10.0) as client:
            resp = await client.get(f"/games/{api_id}", params=params)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            data = resp.json()

        return self._map_game_detail(data)

    def _map_game_summary(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        devs = raw.get("developers") or []
        pubs = raw.get("publishers") or []
        developer = None
        if devs and isinstance(devs[0], dict):
            developer = devs[0].get("name")
        if not developer and pubs and isinstance(pubs[0], dict):
            developer = pubs[0].get("name")
        return {
            "api_id": str(raw.get("id")),
            "title": raw.get("name"),
            "cover_url": (raw.get("background_image") or "") or None,
            "developer": developer,
            "release_year": self._extract_year(raw.get("released")),
            "genre": [g.get("name") for g in raw.get("genres", []) if g.get("name")],
            "api_source": "rawg",
        }

    def _map_game_detail(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        summary = self._map_game_summary(raw)
        stores = raw.get("stores") or []
        for s in stores:
            store_info = s.get("store") or {}
            if store_info.get("slug") == "steam" or store_info.get("domain") == "store.steampowered.com":
                url = s.get("url") or ""
                match = re.search(r"/app/(\d+)", url)
                if match:
                    summary["steam_appid"] = int(match.group(1))
                    break
        return summary

    async def get_game_stores(self, api_id: str) -> Optional[int]:
        """Fetch store links for a game and extract the Steam app ID if available."""
        if not self.api_key or not api_id:
            return None
        params = {"key": self.api_key}
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=10.0) as client:
                resp = await client.get(f"/games/{api_id}/stores", params=params)
                if resp.status_code != 200:
                    return None
                data = resp.json()
            for item in data.get("results", []):
                url = item.get("url") or ""
                if "store.steampowered.com/app/" in url:
                    match = re.search(r"/app/(\d+)", url)
                    if match:
                        return int(match.group(1))
            return None
        except Exception:
            return None

    @staticmethod
    def _extract_year(date_str: Optional[str]) -> Optional[int]:
        if not date_str:
            return None
        try:
            return int(date_str.split("-")[0])
        except (ValueError, AttributeError):
            return None


rawg_client = RawgClient()

