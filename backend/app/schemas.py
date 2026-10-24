from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LeagueOut(_Out):
    league_id: int
    name: str
    country_id: Optional[int] = None
    level: Optional[int] = None
    is_international: bool = False
    is_women: bool = False


class TeamOut(_Out):
    team_id: int
    name: str
    league_id: Optional[int] = None
    league_name: Optional[str] = None
    gender: Optional[int] = None
    overall: Optional[int] = None
    attack: Optional[int] = None
    midfield: Optional[int] = None
    defense: Optional[int] = None


class PlayerSummary(_Out):
    player_id: int
    name: Optional[str] = None  # null nếu chưa import bảng playernames
    jersey_name: Optional[str] = None
    overall: int
    potential: Optional[int] = None
    positions: list[int] = []
    birth_date: Optional[date] = None
    age: Optional[int] = None  # tính theo ngày tham chiếu của game (ước tính)
    nationality_id: Optional[int] = None
    pac_div: Optional[int] = None
    sho_han: Optional[int] = None
    pas_kic: Optional[int] = None
    dri_ref: Optional[int] = None
    def_spe: Optional[int] = None
    phy_pos: Optional[int] = None
    # Chỉ có khi lọc theo đội (?team=)
    team_id: Optional[int] = None
    squad_position: Optional[int] = None
    jersey_number: Optional[int] = None
    injury: Optional[int] = None
    form: Optional[int] = None
    role: Optional[str] = None
    role_label: Optional[str] = None
    line: Optional[str] = None
    in_xi: Optional[bool] = None


class StandingOut(_Out):
    league_id: Optional[int] = None
    position: Optional[int] = None
    points: Optional[int] = None
    played: Optional[int] = None
    home_wins: Optional[int] = None
    home_draws: Optional[int] = None
    home_losses: Optional[int] = None
    away_wins: Optional[int] = None
    away_draws: Optional[int] = None
    away_losses: Optional[int] = None
    home_gf: Optional[int] = None
    home_ga: Optional[int] = None
    away_gf: Optional[int] = None
    away_ga: Optional[int] = None
    form_raw: Optional[str] = None


class SlotOut(BaseModel):
    slot: int
    position: Optional[int] = None
    position_name: str
    line: Optional[str] = None
    inferred: bool = False
    player: Optional[PlayerSummary] = None


class LineupOut(BaseModel):
    source: str  # teamsheet | inferred | none
    formation_id: Optional[int] = None
    relative_formation_id: Optional[int] = None
    formation_name: Optional[str] = None
    slots: list[SlotOut] = []


class TeamOverview(BaseModel):
    team: TeamOut
    standing: Optional[StandingOut] = None
    lineup: LineupOut
    squad: dict[str, list[PlayerSummary]]
    line_averages: dict[str, dict]
    line_labels: dict[str, str]
