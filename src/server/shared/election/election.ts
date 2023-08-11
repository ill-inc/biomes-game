import type { Election, ElectionCampaign } from "@/server/shared/election/api";
import { FakeElection } from "@/server/shared/election/fake";
import { RedisElection } from "@/server/shared/election/redis";
import { DefaultMap } from "@/shared/util/collections";

type ElectionKind = "redis" | "fake";

function determineElectionKind(): ElectionKind {
  if (process.env.ELECTION_KIND) {
    return process.env.ELECTION_KIND as ElectionKind;
  }
  if (process.env.NODE_ENV === "production") {
    return "redis";
  }
  return "fake";
}

const fakeCampaigns = new DefaultMap<ElectionCampaign, Election>(
  (campaign) => new FakeElection(campaign)
);

export async function createElection(
  campaign: ElectionCampaign
): Promise<Election> {
  const kind = determineElectionKind();
  switch (kind) {
    case "redis":
      return RedisElection.create(campaign);
    case "fake":
      return fakeCampaigns.get(campaign);
    default:
      throw new Error(`Unknown election kind: ${kind}`);
  }
}
