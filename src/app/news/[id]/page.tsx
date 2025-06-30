
'use server';

import { getAvailableLeagues } from "@/actions/bet-actions";
import { getPostById, getAuthorInfo } from "@/actions/news-actions";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarFallbackText } from "@/components/avatar-fallback-text";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function linkify(text: string): React.ReactNode[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(/(\n)/g).flatMap(line => line.split(urlRegex));
    
    return parts.map((part, i) => {
        if (part === '\n') {
            return <br key={i} />;
        }
        if (part.match(urlRegex)) {
            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{part}</a>;
        }
        return part;
    });
}


export default async function PostArticlePage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    const hasPermission = session?.user?.admin || session?.user?.canPost;

    const [postData, availableLeagues] = await Promise.all([
        getPostById(params.id),
        getAvailableLeagues(),
    ]);
    
    if (!postData) {
        notFound();
    }
    
    const author = postData.authorId ? await getAuthorInfo(postData.authorId) : null;
    
    if (!hasPermission) {
        return (
            <AppLayout availableLeagues={availableLeagues}>
                <div className="flex-1 p-4 sm:p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto flex items-center justify-center h-full">
                         <Card className="w-full text-center">
                            <CardHeader className="items-center">
                                <Lock className="h-12 w-12 text-destructive" />
                                <CardTitle className="mt-4">Acesso Restrito</CardTitle>
                                <CardDescription>Você não tem permissão para ver o conteúdo completo desta postagem.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/news" className={cn(buttonVariants({ variant: "outline" }))}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Voltar para Notícias
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AppLayout>
        );
    }
    
    if (!author) {
        notFound();
    }

    const timeAgo = formatDistanceToNow(new Date(postData.publishedAt), { addSuffix: true, locale: ptBR });

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <Link href="/news" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Notícias
                    </Link>

                    <Card>
                        <CardHeader>
                             <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={author.avatarUrl} alt={author.name} data-ai-hint="author avatar" />
                                    <AvatarFallback><AvatarFallbackText name={author.name} /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{author.name}</p>
                                     <p className="text-sm text-muted-foreground">
                                        Postado {timeAgo}
                                    </p>
                                </div>
                            </div>
                            <CardTitle className="!mt-6">{postData.title}</CardTitle>
                         </CardHeader>
                        <CardContent className="space-y-4">
                           {postData.imageUrl && (
                                <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                                    <Image
                                        src={postData.imageUrl}
                                        alt={postData.title}
                                        fill
                                        className="object-cover"
                                        data-ai-hint="post image"
                                    />
                                </div>
                            )}
                            <div className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {linkify(postData.content)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
