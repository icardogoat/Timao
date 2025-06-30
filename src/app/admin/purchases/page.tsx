'use server';

import { getAdminPurchases } from "@/actions/admin-actions";
import AdminPurchasesClient from "@/components/admin-purchases-client";

export default async function AdminPurchasesPage() {
    const purchases = await getAdminPurchases();
    return <AdminPurchasesClient initialPurchases={purchases} />;
}
