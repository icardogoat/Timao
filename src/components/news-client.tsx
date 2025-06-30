
'use client';

import type { Post } from '@/types';
import { PostCard } from './news-card';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

interface FeedClientProps {
    initialPosts: Post[];
}

export function FeedClient({ initialPosts }: FeedClientProps) {
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Notícias</h1>
                <p className="text-muted-foreground">Fique por dentro de tudo que acontece com o Corinthians.</p>
            </div>

            {initialPosts.length === 0 ? (
                <div className="flex items-center justify-center pt-16">
                    <Card className="w-full max-w-lg text-center">
                        <CardHeader>
                            <CardTitle>Nenhum post encontrado.</CardTitle>
                            <CardDescription>Os posts mais recentes aparecerão aqui assim que forem publicados.</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {initialPosts.map(post => (
                        <PostCard key={post._id.toString()} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
}
