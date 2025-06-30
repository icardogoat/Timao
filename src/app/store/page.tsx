
'use server';

import { AppLayout } from "@/components/app-layout";
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { StoreClient } from "@/components/store-client";
import { getStoreItems, getUserInventory } from "@/actions/store-actions";

export default async function StorePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/');
    }

    const [availableLeagues, items, inventory] = await Promise.all([
        getAvailableLeagues(),
        getStoreItems(),
        getUserInventory(session.user.discordId)
    ]);
    
    return (
        <AppLayout availableLeagues={availableLeagues}>
            <StoreClient initialItems={items} initialInventory={inventory} />
        </AppLayout>
    );
}
