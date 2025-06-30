
import { AppLayout } from "@/components/app-layout";
import { NotificationItem } from "@/components/notification-item";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getNotificationsForUser } from "@/actions/notification-actions";
import { redirect } from "next/navigation";
import type { Notification } from "@/types";
import { getAvailableLeagues } from "@/actions/bet-actions";

export default async function NotificationsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        redirect('/');
    }

    const [notifications, availableLeagues] = await Promise.all([
        getNotificationsForUser(session.user.discordId),
        getAvailableLeagues(),
    ]);

    return (
        <AppLayout availableLeagues={availableLeagues}>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Notificações</h1>
                    <p className="text-muted-foreground">Veja todas as suas notificações aqui.</p>
                </div>

                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Todas as Notificações</CardTitle>
                        <CardDescription>Aqui estão todas as suas notificações, das mais recentes às mais antigas.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {notifications.length > 0 ? (
                                notifications.map(notification => <NotificationItem key={notification._id as string} notification={notification} />)
                            ) : (
                                <p className="p-6 text-center text-muted-foreground">Nenhuma notificação encontrada.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
