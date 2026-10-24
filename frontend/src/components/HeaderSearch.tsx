"use client";

import { useRouter } from "next/navigation";
import { PlayerAutocomplete } from "./PlayerAutocomplete";
import { playerHref } from "@/lib/routes";

export function HeaderSearch() {
  const router = useRouter();
  return <PlayerAutocomplete clearOnSelect onSelect={(p) => router.push(playerHref(p.player_id))} />;
}
