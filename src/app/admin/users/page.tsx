'use server';

import { getAdminUsers } from "@/actions/admin-actions";
import AdminUsersClient from "@/components/admin-users-client";

export default async function AdminUsersPage() {
    const users = await getAdminUsers();
    return <AdminUsersClient initialUsers={users} />;
}
