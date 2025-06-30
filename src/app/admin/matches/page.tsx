'use server';

import { getAdminMatches } from "@/actions/admin-actions";
import { AdminMatchesClient } from "@/components/admin-matches-client";

export default async function AdminMatchesPage() {
    const matches = await getAdminMatches();
    return <AdminMatchesClient initialMatches={matches} />;
}
