import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.v1.router import router as api_v1_router

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="Checkpoint API", openapi_url="/api/v1/openapi.json")


def _cors_headers(origin: str | None) -> dict:
    """Allow same origin for error responses so browser shows real error instead of CORS."""
    if not origin:
        return {}
    origin = origin.strip().rstrip("/")
    if origin in origins or (_frontend_url and origin == _frontend_url.rstrip("/")):
        return {"Access-Control-Allow-Origin": origin}
    import re
    if re.fullmatch(r"^https://[\w-]+\.vercel\.app$", origin):
        return {"Access-Control-Allow-Origin": origin}
    return {}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s", request.method, request.url)
    traceback.print_exc()
    origin = request.headers.get("Origin")
    headers = {"Content-Type": "application/json", **_cors_headers(origin)}
    return JSONResponse(status_code=500, content={"detail": str(exc)}, headers=headers)


# CORS configuration
import os
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
# Add production frontend URL from env (exact origin for CORS)
_frontend_url = os.environ.get("FRONTEND_URL", "").strip()
if _frontend_url:
    origins.append(_frontend_url.rstrip("/"))

# Allow Vercel deployments (*.vercel.app) and LAN IPs for local testing
allow_origin_regex = r"^https://[\w-]+\.vercel\.app$|^http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok"}


app.include_router(api_v1_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

