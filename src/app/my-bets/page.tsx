import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { redirect } from 'next/navigation';
import type { WithId } from "mongodb";
import { getAvailableLeagues } from "@/actions/bet-actions";
import type { PlacedBet } from "@/types";
import { MyBetsClient } from '@/components/my-bets-client';

async function getMyBets(userId: string): Promise<PlacedBet[]> {
  if (!userId) {
    return [];
  }
  try {
    const client = await clientPromise;
    const db = client.db('timaocord');
    const betsCollection = db.collection<WithId<PlacedBet>>('bets');

    const userBets = await betsCollection
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Map DB objects to plain, serializable objects for client components.
    // This prevents errors when passing props from Server to Client Components.
    return userBets.map(bet => ({
        _id: bet._id.toString(),
        userId: bet.userId,
        bets: bet.bets,
        stake: bet.stake,
        potentialWinnings: bet.potentialWinnings,
        totalOdds: bet.totalOdds,
        status: bet.status,
        createdAt: (bet.createdAt as Date).toISOString(),
        settledAt: bet.settledAt ? (bet.settledAt as Date).toISOString() : undefined,
    })) as PlacedBet[];

  } catch (error) {
    console.error('Failed to fetch user bets:', error);
    return [];
  }
}


export default async function MyBetsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        redirect('/');
    }

    const [placedBets, availableLeagues] = await Promise.all([
        getMyBets(session.user.discordId),
        getAvailableLeagues(),
    ]);

    return (
       <MyBetsClient
            placedBets={placedBets}
            availableLeagues={availableLeagues}
       />
    )
}
