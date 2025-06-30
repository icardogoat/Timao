
'use server';

import { getApiSettings, getSiteSettings } from '@/actions/settings-actions';
import AdminSettingsClient from '@/components/admin-settings-client';

export default async function AdminSettingsPage() {
    const [apiSettings, siteSettings] = await Promise.all([
        getApiSettings(),
        getSiteSettings(),
    ]);
    
    return (
        <AdminSettingsClient
            initialApiSettings={apiSettings}
            initialSiteSettings={siteSettings}
        />
    );
}
