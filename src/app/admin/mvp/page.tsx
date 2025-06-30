
'use server';

import { getAdminVotings } from "@/actions/admin-actions";
import AdminMvpClient from "@/components/admin-mvp-client";

export default async function AdminMvpPage() {
    const votings = await getAdminVotings();
    
    return <AdminMvpClient initialVotings={votings} />;
}
