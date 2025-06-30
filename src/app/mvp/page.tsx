
'use server';

import { AppLayout } from '@/components/app-layout';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getActiveVotings } from '@/actions/mvp-actions';
import { MvpClient } from '@/components/mvp-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { LockedFeatureCard } from '@/components/locked-feature-card';

export default async function MvpPage() {
    const session = await getServerSession(authOptions);
    const [availableLeagues] = await Promise.all([
        getAvailableLeagues(),
    ]);

    if (!session?.user?.canAccessMvp) {
         return (
            <AppLayout availableLeagues={availableLeagues}>
                <LockedFeatureCard feature="mvp" />
            </AppLayout>
        );
    }

    const activeVotings = await getActiveVotings();

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <MvpClient activeVotings={activeVotings} sessionUser={session?.user ?? null} />
        </AppLayout>
    );
}
