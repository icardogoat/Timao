
'use server';

import { AppLayout } from '@/components/app-layout';
import { getAvailableLeagues } from '@/actions/bet-actions';
import { getPublicPosts } from '@/actions/news-actions';
import { FeedClient } from '@/components/news-client';

export default async function FeedPage() {
    const [availableLeagues, initialPosts] = await Promise.all([
        getAvailableLeagues(),
        getPublicPosts(),
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <FeedClient initialPosts={initialPosts} />
        </AppLayout>
    );
}
