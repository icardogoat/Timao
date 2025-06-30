
'use server';

import { getAdminStoreItems } from "@/actions/admin-actions";
import AdminStoreClient from "@/components/admin-store-client";

export default async function AdminStorePage() {
    const items = await getAdminStoreItems();
    
    return <AdminStoreClient initialItems={items} />;
}
