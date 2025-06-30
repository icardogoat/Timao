'use server';

import { getPromoCodes } from "@/actions/admin-actions";
import AdminCodesClient from "@/components/admin-codes-client";

export default async function AdminCodesPage() {
    const codes = await getPromoCodes();
    return <AdminCodesClient initialCodes={codes} />;
}
