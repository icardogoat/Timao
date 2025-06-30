'use server';

import { getAdminBets } from "@/actions/admin-actions";
import { AdminBetsClient } from "@/components/admin-bets-client";

export default async function AdminBetsPage() {
    const bets = await getAdminBets();
    return <AdminBetsClient initialBets={bets} />;
}
