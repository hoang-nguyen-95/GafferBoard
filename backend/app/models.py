from datetime import date
from typing import Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

# Khóa ngoại chỉ mang tính tài liệu (SQLite không ép buộc): dữ liệu xuất của game có
# tham chiếu thiếu (vd leagueid 383 không có trong leagues) nên không được chặn import.


class League(SQLModel, table=True):
    league_id: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    name: str
    country_id: Optional[int] = None
    level: Optional[int] = None
    is_international: bool = False
    is_women: bool = False


class Team(SQLModel, table=True):
    team_id: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    name: str
    gender: Optional[int] = None
    overall: Optional[int] = None
    attack: Optional[int] = None
    midfield: Optional[int] = None
    defense: Optional[int] = None
    build_up_play: Optional[int] = None
    defensive_depth: Optional[int] = None
    captain_id: Optional[int] = None
    penalty_taker_id: Optional[int] = None
    popularity: Optional[int] = None


class Player(SQLModel, table=True):
    player_id: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    # Tên: players.csv chỉ có ID tên; các cột dưới đây được điền từ bảng playernames (importers/names.py).
    name: Optional[str] = Field(default=None, index=True)
    jersey_name: Optional[str] = None  # tên in trên áo, vd "B.Fernandes"
    name_search: Optional[str] = Field(default=None, index=True)  # chữ thường, bỏ dấu, cho autocomplete
    first_name_id: Optional[int] = None
    last_name_id: Optional[int] = None
    common_name_id: Optional[int] = None
    jersey_name_id: Optional[int] = None
    birth_date: Optional[date] = None
    gender: Optional[int] = None
    nationality_id: Optional[int] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    overall: int = 0
    potential: Optional[int] = None
    primary_position: Optional[int] = Field(default=None, index=True)  # preferredposition1
    positions: list[int] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    preferred_foot: Optional[int] = None
    weak_foot: Optional[int] = None
    skill_moves: Optional[int] = None
    international_rep: Optional[int] = None
    contract_until: Optional[int] = None
    # Bitfield, chưa giải mã (xem docs/data-schema.md)
    trait1: Optional[int] = None
    trait2: Optional[int] = None
    icon_trait1: Optional[int] = None
    icon_trait2: Optional[int] = None
    # Chỉ số tổng hợp hiển thị trên thẻ (GK: DIV/HAN/KIC/REF/SPE/POS)
    pac_div: Optional[int] = None
    sho_han: Optional[int] = None
    pas_kic: Optional[int] = None
    dri_ref: Optional[int] = None
    def_spe: Optional[int] = None
    phy_pos: Optional[int] = None
    # Chỉ số chi tiết
    acceleration: Optional[int] = None
    sprint_speed: Optional[int] = None
    finishing: Optional[int] = None
    shot_power: Optional[int] = None
    long_shots: Optional[int] = None
    positioning: Optional[int] = None
    volleys: Optional[int] = None
    penalties: Optional[int] = None
    short_passing: Optional[int] = None
    long_passing: Optional[int] = None
    vision: Optional[int] = None
    crossing: Optional[int] = None
    curve: Optional[int] = None
    free_kick_accuracy: Optional[int] = None
    dribbling: Optional[int] = None
    ball_control: Optional[int] = None
    agility: Optional[int] = None
    balance: Optional[int] = None
    reactions: Optional[int] = None
    composure: Optional[int] = None
    defensive_awareness: Optional[int] = None
    interceptions: Optional[int] = None
    standing_tackle: Optional[int] = None
    sliding_tackle: Optional[int] = None
    strength: Optional[int] = None
    stamina: Optional[int] = None
    aggression: Optional[int] = None
    jumping: Optional[int] = None
    heading_accuracy: Optional[int] = None
    gk_diving: Optional[int] = None
    gk_handling: Optional[int] = None
    gk_kicking: Optional[int] = None
    gk_positioning: Optional[int] = None
    gk_reflexes: Optional[int] = None


class SquadMember(SQLModel, table=True):
    """Cầu thủ thuộc đội (teamplayerlinks). Một cầu thủ có thể thuộc cả CLB và đội tuyển."""

    team_id: int = Field(primary_key=True, index=True, sa_column_kwargs={"autoincrement": False})
    player_id: int = Field(primary_key=True, index=True, sa_column_kwargs={"autoincrement": False})
    # <28: đá chính (mã vị trí trên sân), 28: dự bị, 29: ngoài danh sách
    position: Optional[int] = None
    jersey_number: Optional[int] = None
    injury: Optional[int] = None
    form: Optional[int] = None
    league_appearances: Optional[int] = None
    league_goals: Optional[int] = None
    yellows: Optional[int] = None
    reds: Optional[int] = None


class TeamStanding(SQLModel, table=True):
    team_id: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    league_id: Optional[int] = Field(default=None, index=True)
    position: Optional[int] = None
    previous_position: Optional[int] = None
    points: Optional[int] = None
    played: Optional[int] = None
    home_wins: Optional[int] = None
    home_draws: Optional[int] = None
    home_losses: Optional[int] = None
    home_gf: Optional[int] = None
    home_ga: Optional[int] = None
    away_wins: Optional[int] = None
    away_draws: Optional[int] = None
    away_losses: Optional[int] = None
    away_gf: Optional[int] = None
    away_ga: Optional[int] = None
    # Chuỗi chữ số 0/1/2 như game ghi (chữ số 0 đầu có thể bị mất); chưa giải mã ý nghĩa.
    form_raw: Optional[str] = None
    last_result: Optional[int] = None


class TeamLineup(SQLModel, table=True):
    team_id: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    formation_id: Optional[int] = None
    relative_formation_id: Optional[int] = None  # sơ đồ chung (FormationDef) mà đội này dùng
    formation_name: Optional[str] = None
    captain_id: Optional[int] = None
    penalty_taker_id: Optional[int] = None
    # [{"slot": 0, "position": 0, "role": 4162, "player_id": 254803 | null}, ...] (11 slot)
    slots: list[dict] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))


class Fixture(SQLModel, table=True):
    fixture_id: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    competition_id: Optional[int] = Field(default=None, index=True)
    home_team_id: int = Field(index=True)
    away_team_id: int = Field(index=True)
    fixture_date: Optional[date] = Field(default=None, index=True)
    fixture_time: Optional[int] = None  # giây trong ngày
    home_form_raw: Optional[str] = None
    away_form_raw: Optional[str] = None
    home_league_pos: Optional[int] = None
    away_league_pos: Optional[int] = None
    home_played: Optional[int] = None
    away_played: Optional[int] = None
    stadium_id: Optional[int] = None


class UserProfile(SQLModel, table=True):
    user_id: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    user_team_id: Optional[int] = None
    league_id: Optional[int] = None
    first_name: Optional[str] = None
    surname: Optional[str] = None


class FormationDef(SQLModel, table=True):
    """Sơ đồ chung của game (formations.teamid = -1): 11 mã vị trí, slot 0 luôn là GK."""

    formation_id: int = Field(primary_key=True, sa_column_kwargs={"autoincrement": False})
    name: str  # vd "4-3-3"; nhiều biến thể cùng tên khác bộ vị trí
    full_name_id: Optional[int] = None
    attackers: Optional[float] = None
    midfielders: Optional[float] = None
    defenders: Optional[float] = None
    positions: list[int] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
