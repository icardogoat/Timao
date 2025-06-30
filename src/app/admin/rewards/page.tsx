
'use server';

import { getApiSettings } from '@/actions/settings-actions';
import AdminRewardsClient from '@/components/admin-rewards-client';

export default async function AdminRewardsPage() {
    const apiSettings = await getApiSettings();
    return <AdminRewardsClient initialSettings={apiSettings} />;
}
