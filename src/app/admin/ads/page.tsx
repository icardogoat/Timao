'use server';

import { getAdminAdvertisements } from "@/actions/admin-actions";
import AdminAdsClient from "@/components/admin-ads-client";

export default async function AdminAdsPage() {
    const ads = await getAdminAdvertisements();
    return <AdminAdsClient initialAds={ads} />;
}
