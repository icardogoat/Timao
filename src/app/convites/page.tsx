
'use server';

import { AppLayout } from "@/components/app-layout";
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getTopInviters } from "@/actions/user-actions";
import { InvitesClient } from "@/components/invites-client";

export default async function InvitesPage() {
  const [
    availableLeagues,
    topInviters,
  ] = await Promise.all([
      getAvailableLeagues(),
      getTopInviters(),
  ]);

  return (
      <AppLayout availableLeagues={availableLeagues}>
          <InvitesClient
              topInviters={topInviters}
          />
      </AppLayout>
  );
}
