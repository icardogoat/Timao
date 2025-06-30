'use server';

import { getLiveStreams } from '@/actions/stream-actions';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tv, Eye } from 'lucide-react';
import Link from 'next/link';

export default async function StreamSelectPage() {
    const streams = await getLiveStreams();

    return (
        <AppLayout>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Transmissões ao Vivo</h1>
                    <p className="text-muted-foreground">Assista às transmissões da comunidade.</p>
                </div>

                {streams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {streams.map(stream => (
                            <Card key={stream._id.toString()}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Tv className="h-6 w-6 text-primary" />
                                        {stream.name}
                                    </CardTitle>
                                    <CardDescription>
                                        Criado em {new Date(stream.createdAt).toLocaleDateString('pt-BR')}
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <Link href={`/stream/${stream._id.toString()}`} target="_blank">
                                            <Eye className="mr-2 h-4 w-4" />
                                            Assistir Transmissão
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64">
                         <Card className="w-full max-w-md text-center">
                            <CardHeader>
                                <CardTitle>Nenhuma Transmissão Ativa</CardTitle>
                                <CardDescription>Volte mais tarde para assistir a uma transmissão.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
