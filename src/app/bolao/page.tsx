
'use server';

import { AppLayout } from '@/components/app-layout';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getActiveBoloes } from '@/actions/bolao-actions';
import { BolaoClient } from '@/components/bolao-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { LockedFeatureCard } from '@/components/locked-feature-card';

export default async function BolaoPage() {
    const session = await getServerSession(authOptions);
    const [availableLeagues] = await Promise.all([
        getAvailableLeagues(),
    ]);

    if (!session?.user?.canAccessBolao) {
        return (
            <AppLayout availableLeagues={availableLeagues}>
                <LockedFeatureCard feature="bolao" />
            </AppLayout>
        );
    }

    const activeBoloes = await getActiveBoloes();

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <BolaoClient activeBoloes={activeBoloes} sessionUser={session?.user ?? null} />
        </AppLayout>
    );
}
