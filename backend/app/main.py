from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import run_migrations
from app.routers import analysis, home, lineups, manual, players, results, teams

@asynccontextmanager
async def lifespan(_: FastAPI):
    run_migrations()  # DB cũ (tạo bằng phiên bản trước) tự được nâng cấp khi khởi động API
    yield


app = FastAPI(
    title="CounterPick FC", description="Phân tích đối thủ cho Career Mode (local, offline)", lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
app.include_router(teams.router)
app.include_router(players.router)
app.include_router(analysis.router)
app.include_router(results.router)
app.include_router(home.router)
app.include_router(lineups.router)
app.include_router(manual.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
