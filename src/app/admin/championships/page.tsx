
'use server';

import { getAdminChampionships } from "@/actions/admin-actions";
import { AdminChampionshipsClient } from "@/components/admin-championships-client";

export default async function AdminChampionshipsPage() {
    const championships = await getAdminChampionships();
    
    return <AdminChampionshipsClient initialChampionships={championships} />;
}
