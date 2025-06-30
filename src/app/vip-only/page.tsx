
'use server';

import { getBotConfig } from '@/actions/bot-config-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { DiscordLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem } from 'lucide-react';

export default async function VipOnlyPage() {
    const { guildInviteUrl } = await getBotConfig();

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            <Card className="w-full max-w-md shadow-lg z-10">
                <CardHeader className="text-center">
                     <Link href="/" className="flex items-center justify-center mb-6">
                        <Image
                            src="https://i.imgur.com/xD76hcl.png"
                            alt="Timaocord Logo"
                            width={500}
                            height={127}
                            className="h-16 w-auto"
                            priority
                            data-ai-hint="logo"
                        />
                    </Link>
                    <div className="mx-auto bg-vip/10 p-3 rounded-full w-fit">
                        <Gem className="h-8 w-8 text-vip" />
                    </div>
                    <CardTitle className="mt-4">Acesso Exclusivo VIP</CardTitle>
                    <CardDescription>
                       O site está atualmente em modo beta, acessível apenas para membros VIP.
                    </CardDescription>
                </CardHeader>
                
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Para saber mais sobre como se tornar VIP e ter acesso antecipado, entre em nossa comunidade no Discord.
                    </p>
                </CardContent>

                <CardFooter className="flex-col gap-4">
                    {guildInviteUrl ? (
                         <Button asChild className="w-full" size="lg">
                            <Link href={guildInviteUrl} target="_blank" rel="noopener noreferrer">
                                <DiscordLogo className="mr-2 h-5 w-5" />
                                Entrar no Discord
                            </Link>
                        </Button>
                    ) : (
                        <p className="text-center text-sm text-destructive w-full">
                           O link de convite para o servidor não está configurado. Por favor, entre em contato com um administrador.
                        </p>
                    )}
                    <Button asChild variant="link" className="w-full">
                        <Link href="/">
                            Voltar para a página inicial
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
