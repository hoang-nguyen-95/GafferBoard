"use client";

import { useRouter } from "next/navigation";
import { PlayerAutocomplete } from "./PlayerAutocomplete";

export function HeaderSearch() {
  const router = useRouter();
  return <PlayerAutocomplete clearOnSelect onSelect={(p) => router.push(`/players/${p.player_id}`)} />;
}
