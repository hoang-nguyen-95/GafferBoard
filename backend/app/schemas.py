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
    name: Optional[str] = None  # null cho tới khi import bảng playernames
    overall: int
    potential: Optional[int] = None
    positions: list[int] = []
    birth_date: Optional[date] = None
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
