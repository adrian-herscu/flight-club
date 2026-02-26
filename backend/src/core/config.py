from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

    database_url: str = "sqlite+aiosqlite:///:memory:"
    supabase_url: str = "https://test.supabase.co"
    supabase_anon_key: str = "test_key"
    supabase_jwt_secret: str = "test_secret"
    resend_api_key: str = "test_key"
    frontend_url: str = "http://localhost:3000"


settings = Settings()
