

import { AppLayout } from "@/components/app-layout";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from 'next/navigation';
import { getAvailableLeagues } from "@/actions/bet-actions";
import { getApiSettings } from "@/actions/settings-actions";
import type { Transaction } from "@/types";
import { WalletClient } from "@/components/wallet-client";

export default async function WalletPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/');
    }
    
    const [availableLeagues, apiSettings] = await Promise.all([
        getAvailableLeagues(),
        getApiSettings(),
    ]);

    let currentBalance = 0;
    let transactions: Transaction[] = [];

    try {
        const client = await clientPromise;
        const db = client.db("timaocord");
        const walletData = await db.collection("wallets").findOne({ userId: session.user.discordId });

        if (walletData) {
            currentBalance = walletData.balance;
            transactions = walletData.transactions.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
    } catch (error) {
        console.error("Failed to fetch wallet data:", error);
    }
    
    return (
       <WalletClient 
            availableLeagues={availableLeagues}
            initialBalance={currentBalance}
            initialTransactions={transactions}
            apiSettings={apiSettings}
       />
    );
}
