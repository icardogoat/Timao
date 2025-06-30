
'use client';

import type { Post, AuthorInfo } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AvatarFallbackText } from './avatar-fallback-text';
import { Button } from './ui/button';
import { ArrowRight, Pin, Lock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getAuthorInfo } from '@/actions/news-actions';
import { Skeleton } from './ui/skeleton';

interface PostCardProps {
    post: Post;
}

function ClientTime({ date }: { date: string | Date }) {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        setTimeAgo(formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR }));
    }, [date]);

    return <>{timeAgo}</>;
}

export function PostCard({ post }: PostCardProps) {
    const { data: session } = useSession();
    const hasPermission = session?.user?.admin || session?.user?.canPost;

    const [author, setAuthor] = useState<AuthorInfo | null>(post.author ?? null);
    const [isLoadingAuthor, setIsLoadingAuthor] = useState(!post.author);

    useEffect(() => {
        if (!post.author && post.authorId) {
            getAuthorInfo(post.authorId).then(authorInfo => {
                setAuthor(authorInfo);
                setIsLoadingAuthor(false);
            });
        }
    }, [post.author, post.authorId]);

    // Show a skeleton while loading the author
    if (isLoadingAuthor) {
        return (
            <Card className="flex flex-col overflow-hidden h-full group">
                 {post.imageUrl && (
                    <div className="overflow-hidden relative">
                        <Skeleton className="h-40 w-full" />
                    </div>
                )}
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-3/4 !mt-4" />
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </CardContent>
                 <CardFooter>
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        );
    }
    
    if (!author) { // if author fetch failed or post had no authorId
        return null;
    }

    return (
        <Card className="flex flex-col overflow-hidden h-full group">
            {post.imageUrl && (
                <div className="overflow-hidden relative">
                     <Image
                        src={post.imageUrl}
                        alt={post.title}
                        width={400}
                        height={200}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint="post image"
                    />
                </div>
            )}
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={author.avatarUrl} alt={author.name} data-ai-hint="author avatar" />
                        <AvatarFallback><AvatarFallbackText name={author.name} /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-semibold truncate">{author.name}</p>
                        <p className="text-xs text-muted-foreground"><ClientTime date={post.publishedAt} /></p>
                    </div>
                    {post.isPinned && <Pin className="h-4 w-4 text-primary" />}
                </div>
                <CardTitle className="!mt-2">{post.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3">{post.content}</p>
            </CardContent>
            {hasPermission && (
                <CardFooter>
                    <Button asChild variant="secondary" className="w-full">
                        <Link href={`/news/${post._id.toString()}`}>
                            Ler Mais <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
