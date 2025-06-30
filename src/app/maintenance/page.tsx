import { getSiteSettings } from '@/actions/settings-actions';
import { getBotConfig } from '@/actions/bot-config-actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { HardHat, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DiscordLogo } from '@/components/icons';

export default async function MaintenancePage() {
    const { maintenanceMessage, maintenanceExpectedReturn } = await getSiteSettings();
    const { guildInviteUrl } = await getBotConfig();

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground relative">
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            <main className="flex flex-1 flex-col items-center justify-center p-4 z-10">
                <Card className="w-full max-w-lg shadow-lg">
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
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                            <HardHat className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="mt-4 text-2xl">Em Manutenção</CardTitle>
                        <CardDescription>
                           {maintenanceMessage}
                        </CardDescription>
                    </CardHeader>
                    
                    {maintenanceExpectedReturn && (
                         <CardContent className="text-center">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>Retorno previsto: {maintenanceExpectedReturn}</span>
                            </div>
                        </CardContent>
                    )}

                    {guildInviteUrl && (
                        <CardFooter className="flex-col items-center justify-center pt-6 border-t">
                            <p className="text-sm text-muted-foreground mb-4">Para mais informações, junte-se à nossa comunidade.</p>
                            <Button asChild>
                                <Link href={guildInviteUrl} target="_blank" rel="noopener noreferrer">
                                    <DiscordLogo className="mr-2 h-5 w-5" />
                                    Entrar no Discord
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </main>
        </div>
    );
}
