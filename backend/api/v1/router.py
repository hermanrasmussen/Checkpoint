from fastapi import APIRouter

from backend.api.v1.routers.collections import router as collections_router
from backend.api.v1.routers.feed import router as feed_router
from backend.api.v1.routers.games import router as games_router
from backend.api.v1.routers.library import router as library_router
from backend.api.v1.routers.profile import router as profile_router
from backend.api.v1.routers.stats import router as stats_router
from backend.api.v1.routers.steam import router as steam_router

router = APIRouter(prefix="/api/v1")

router.include_router(collections_router, prefix="/collections", tags=["collections"])
router.include_router(feed_router, prefix="/feed", tags=["feed"])
router.include_router(games_router, prefix="/games", tags=["games"])
router.include_router(library_router, prefix="/library", tags=["library"])
router.include_router(profile_router, prefix="/profile", tags=["profile"])
router.include_router(stats_router, prefix="/stats", tags=["stats"])
router.include_router(steam_router, prefix="/steam", tags=["steam"])

