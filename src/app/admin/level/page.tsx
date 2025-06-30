'use server';

import { getLevelConfig } from '@/actions/level-actions';
import AdminLevelClient from '@/components/admin-level-client';

export default async function AdminLevelPage() {
    const levels = await getLevelConfig();
    return <AdminLevelClient initialLevels={levels} />;
}
