import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.v1.router import router as api_v1_router

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="Checkpoint API", openapi_url="/api/v1/openapi.json")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s", request.method, request.url)
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": str(exc)})


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
# Add production frontend URL from env
_frontend_url = os.environ.get("FRONTEND_URL", "").strip()
if _frontend_url:
    origins.append(_frontend_url.rstrip("/"))

# Allow LAN IPs (192.168.x.x, 10.x.x.x) for mobile testing on same network
allow_origin_regex = r"http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+"

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

