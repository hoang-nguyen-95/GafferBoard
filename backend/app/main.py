from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import players, teams

app = FastAPI(title="CounterPick FC", description="Phân tích đối thủ cho Career Mode (local, offline)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(teams.router)
app.include_router(players.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
