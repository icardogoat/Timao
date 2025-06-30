
'use server';

import { getAdminEvents } from '@/actions/admin-actions';
import AdminEventsClient from '@/components/admin-events-client';

export default async function AdminEventsPage() {
    const events = await getAdminEvents();
    return <AdminEventsClient initialEvents={events} />;
}
