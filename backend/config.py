from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    rawg_api_key: str | None = None
    rawg_base_url: str = "https://api.rawg.io/api"

    steamgriddb_api_key: str | None = None

    steam_api_key: str | None = None

    database_url: str | None = None

    supabase_jwt_secret: str | None = None
    supabase_project_ref: str | None = None

    class Config:
        env_file = ("backend/.env", ".env")
        env_file_encoding = "utf-8"


settings = Settings()

