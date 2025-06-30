
import 'next-auth';
import type { DefaultSession, DefaultUser } from 'next-auth';
import type { UserLevel } from '@/types';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      discordId: string;
      balance: number;
      admin: boolean;
      level: UserLevel;
      isVip: boolean;
      canPost: boolean;
      canViewStream: boolean;
      adRemovalExpiresAt: string | null;
      dailyRewardLastClaimed: string | null;
      lastDailyCodeClaim?: string | null;
      canAccessBolao: boolean;
      canAccessMvp: boolean;
    } & DefaultSession['user'];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the database user object.
   */
  interface User extends DefaultUser {
    discordId: string;
    admin: boolean;
    isVip: boolean;
    canPost: boolean;
  }
}
