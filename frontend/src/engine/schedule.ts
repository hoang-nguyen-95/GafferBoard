// Trận kế tiếp của một đội (khớp backend/app/services/schedule.py): sớm nhất theo (ngày, giờ, fixture_id), ngày trống xếp cuối.
import type { Store } from "./store";
import type { Fixture } from "./types";

const cmpNullsLast = (a: string | number | null, b: string | number | null): number => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
};

export function upcomingFixtures(store: Store, teamId: number, limit = 5): Fixture[] {
  return [...store.data.fixtures.values()]
    .filter((f) => f.home_team_id === teamId || f.away_team_id === teamId)
    .sort((a, b) => cmpNullsLast(a.fixture_date, b.fixture_date) || cmpNullsLast(a.fixture_time, b.fixture_time) || a.fixture_id - b.fixture_id)
    .slice(0, limit);
}

export const opponentOf = (f: Fixture, teamId: number): number => (f.home_team_id === teamId ? f.away_team_id : f.home_team_id);
