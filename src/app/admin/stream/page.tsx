'use server';

import { getLiveStreams } from '@/actions/stream-actions';
import { AdminStreamClient } from '@/components/admin-stream-client';

export default async function AdminStreamPage() {
    const streams = await getLiveStreams();
    return <AdminStreamClient initialStreams={streams} />;
}
