# Backend only (Railway). Build from repo root.
FROM python:3.11-slim

WORKDIR /app

# Copy backend code and deps (paths relative to repo root)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/

# Railway sets PORT
ENV PORT=8000
EXPOSE 8000
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}
