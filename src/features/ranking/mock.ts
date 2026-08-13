import type { RankingEntry } from "@/lib/api/ranking.service";

export const mockRanking: RankingEntry[] = [
  { id: "u1", rank: 1, username: "PlayerOne", displayName: "PlayerOne", xp: 18420 },
  { id: "u2", rank: 2, username: "PlayerTwo", displayName: "PlayerTwo", xp: 17305 },
  { id: "u3", rank: 3, username: "PlayerThree", displayName: "PlayerThree", xp: 15120 },
  { id: "u4", rank: 4, username: "smokeNinja", displayName: "smokeNinja", xp: 13890 },
  { id: "u5", rank: 5, username: "LineupMaster", displayName: "LineupMaster", xp: 11640 },
  { id: "u6", rank: 6, username: "clutchGo", displayName: "clutchGo", xp: 10210 },
  { id: "u7", rank: 7, username: "ecoWarrior", displayName: "ecoWarrior", xp: 8940 },
];