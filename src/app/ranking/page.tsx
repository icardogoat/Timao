

'use server';

import { AppLayout } from "@/components/app-layout";
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getTopWinners, getMostActiveBettors, getTopLevelUsers, getRichestUsers, getTopInviters } from "@/actions/user-actions";
import { RankingClient } from "@/components/ranking-client";

export default async function RankingPage() {
  const [
    availableLeagues,
    topWinners,
    mostActiveBettors,
    topLevelUsers,
    richestUsers,
    topInviters,
  ] = await Promise.all([
      getAvailableLeagues(),
      getTopWinners(),
      getMostActiveBettors(),
      getTopLevelUsers(),
      getRichestUsers(),
      getTopInviters(),
  ]);

  return (
      <AppLayout availableLeagues={availableLeagues}>
          <RankingClient
              topWinners={topWinners}
              mostActiveBettors={mostActiveBettors}
              topLevelUsers={topLevelUsers}
              richestUsers={richestUsers}
              topInviters={topInviters}
          />
      </AppLayout>
  );
}
