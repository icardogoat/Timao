
import NextAuth from 'next-auth';
import type { AuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { Notification, Transaction } from '@/types';
import { getUserLevel } from '@/actions/user-actions';
import { getBotConfig } from '@/actions/bot-config-actions';
import { grantAchievement } from '@/actions/achievement-actions';
import { ObjectId } from 'mongodb';
import { getLevelConfig } from '@/actions/level-actions';

async function checkUserInGuild(discordId: string): Promise<boolean> {
    try {
        const config = await getBotConfig();
        if (!config.guildId) {
            console.warn('Discord Guild ID not configured. Membership check is disabled, allowing login.');
            return true;
        }

        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
            console.warn('Discord bot token not configured. Membership check cannot be performed, allowing login as a fallback. Please configure DISCORD_BOT_TOKEN in your .env file to enforce guild membership.');
            return true; // Allow login if token is missing, with a warning.
        }

        const response = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/members/${discordId}`, {
            headers: { 'Authorization': `Bot ${botToken}` },
            cache: 'no-store'
        });

        if (response.ok) {
            // User is in the guild
            return true;
        }

        if (response.status === 404) {
            // User is definitely not in the guild
            console.log(`User ${discordId} is not in guild ${config.guildId}. Denying login.`);
            return false;
        }
        
        // For other errors (e.g., 403 Forbidden due to missing intents), we can't be certain.
        // Log the error but allow login to avoid locking out users due to bot config issues.
        const errorText = await response.text();
        console.error(`Could not definitively check guild membership for user ${discordId} due to a Discord API error. Status: ${response.status}. Response: ${errorText}. Allowing login as a fallback to prevent user lockout.`);
        return true;

    } catch (error) {
        // Also allow login for network errors, as it's not the user's fault.
        console.error(`A network or other unexpected error occurred while checking guild membership for ${discordId}. Allowing login as a fallback.`, error);
        return true;
    }
}

async function checkUserHasRoles(discordId: string, roleIds: string[]): Promise<boolean> {
     try {
        const config = await getBotConfig();
        if (!config.guildId || !roleIds || roleIds.length === 0) {
            return false;
        }

        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) return false;

        const response = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/members/${discordId}`, {
            headers: { 'Authorization': `Bot ${botToken}` },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.warn(`Could not fetch member data for ${discordId} from guild ${config.guildId}. Status: ${response.status}`);
            return false;
        }

        const member = await response.json();
        if (!member.roles) return false;
        
        const userRoleIds = new Set(member.roles);
        
        return roleIds.some(vipRoleId => userRoleIds.has(vipRoleId));
    } catch (error) {
        console.error(`Failed to check roles for user ${discordId}:`, error);
        return false;
    }
}

const providers = [];
const discordProfile = (profile: any) => {
    if (!profile.discriminator || profile.discriminator === "0") {
        const numericId = BigInt(profile.id);
        const defaultAvatarNumber = Number(numericId % 6n);
        const image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;

        return {
            id: profile.id,
            name: profile.global_name || profile.username,
            email: profile.email,
            image: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : image_url,
            discordId: profile.id,
            admin: false,
            isVip: false,
            canPost: false,
        };
    }
    
    let image_url: string;
    if (profile.avatar) {
      const format = profile.avatar.startsWith("a_") ? "gif" : "png"
      image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`
    } else {
      const defaultAvatarNumber = parseInt(profile.discriminator) % 5;
      image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`
    }

    return {
      id: profile.id,
      name: profile.username,
      email: profile.email,
      image: image_url,
      discordId: profile.id,
      admin: false,
      isVip: false,
      canPost: false,
    }
};

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  providers.push(
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      profile: discordProfile,
    })
  );
} else {
  console.error("\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!!         DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET       !!!");
  console.error("!!!              are not set in the .env file.               !!!");
  console.error("!!!          Authentication will not work until set.         !!!");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n");
}


export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise, { databaseName: "timaocord" }),
  providers: providers,
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, profile }) {
      if (!profile && !user) return false;
      
      const userId = profile?.id ?? user.id;
      if(!userId) return false;

      const isMember = await checkUserInGuild(userId);
      if (!isMember) {
        // If the guild is configured and we are SURE the user is not a member, redirect.
        const { guildId } = await getBotConfig();
        if (guildId) {
            return '/join-server';
        }
        // Deny sign-in if check fails for other reasons (e.g. no bot token)
        return false;
      }
      
      try {
        const client = await clientPromise;
        const db = client.db("timaocord");
        const usersCollection = db.collection("users");
        
        const dbUser = await usersCollection.findOne({ discordId: userId });
        
        if (dbUser) {
            const config = await getBotConfig();
            const isVip = await checkUserHasRoles(userId, config.vipRoleIds || []);
            if (isVip) {
                await grantAchievement(userId, 'vip_status');
            }

            const updateOps: any = {};
            if (dbUser.isVip !== isVip) updateOps.isVip = isVip;
            if (typeof dbUser.emailVerified === 'undefined') updateOps.emailVerified = null;
            if (typeof dbUser.level === 'undefined') updateOps.level = 1;
            if (typeof dbUser.xp === 'undefined') updateOps.xp = 0;
            if (typeof dbUser.unlockedAchievements === 'undefined') updateOps.unlockedAchievements = [];
            if (typeof dbUser.adRemovalExpiresAt === 'undefined') updateOps.adRemovalExpiresAt = null;
            if (typeof dbUser.dailyRewardLastClaimed === 'undefined') updateOps.dailyRewardLastClaimed = null;
            if (typeof dbUser.lastDailyCodeClaim === 'undefined') updateOps.lastDailyCodeClaim = null;

            if (Object.keys(updateOps).length > 0) {
                 await usersCollection.updateOne(
                    { _id: dbUser._id },
                    { $set: updateOps }
                );
            }
        }

        const walletsCollection = db.collection("wallets");
        const existingWallet = await walletsCollection.findOne({ userId: userId });

        if (!existingWallet) {
          // Check if the new user is a VIP to grant a special welcome bonus
          const config = await getBotConfig();
          const isVip = await checkUserHasRoles(userId, config.vipRoleIds || []);

          const bonusAmount = isVip ? 5000 : 1000;
          const bonusDescription = isVip ? 'Bônus de boas-vindas VIP!' : 'Bônus de boas-vindas!';
          
          const initialTransaction: Transaction = {
            id: new ObjectId().toString(),
            type: 'Bônus',
            description: bonusDescription,
            amount: bonusAmount,
            date: new Date().toISOString(),
            status: 'Concluído'
          };
          
          await walletsCollection.insertOne({
            userId: userId,
            balance: bonusAmount,
            transactions: [initialTransaction]
          });

          const notificationsCollection = db.collection("notifications");
          const welcomeNotification: Omit<Notification, '_id'> = {
              userId: userId,
              title: 'Bem-vindo ao FielBet!',
              description: `Você recebeu R$ ${bonusAmount.toFixed(2)} de bônus para começar a apostar. Boa sorte!`,
              date: new Date(),
              read: false,
              link: '/wallet'
          };
          await notificationsCollection.insertOne(welcomeNotification as any);
          
          // Grant beginner achievement for new users
          await grantAchievement(userId, 'beginner');
        }
      } catch (error) {
        console.error("Failed to create or check wallet/level for user:", error);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      try {
        // On initial sign-in, attach the discordId to the token
        if (user) {
          token.discordId = user.discordId;
        }

        const discordId = token.discordId as string;
        if (!discordId) {
            return token; // Cannot proceed without discordId
        }

        const client = await clientPromise;
        const db = client.db("timaocord");
        const usersCollection = db.collection("users");
        
        // Always check for the latest user data from DB
        const dbUser = await usersCollection.findOne({ discordId });

        if (!dbUser) {
            // This case should ideally not happen if signIn is successful
            return token;
        }

        const config = await getBotConfig();
        const [isVip, canPost, canViewStream] = await Promise.all([
             checkUserHasRoles(discordId, config.vipRoleIds || []),
             checkUserHasRoles(discordId, config.postCreatorRoleId ? [config.postCreatorRoleId] : []),
             checkUserHasRoles(discordId, config.streamViewerRoleId ? [config.streamViewerRoleId] : [])
        ]);

        token.isVip = isVip;
        token.admin = dbUser.admin ?? false;
        token.canPost = canPost;
        token.canViewStream = dbUser.admin || canViewStream;
        
        // Robust date handling
        const adRemovalDate = dbUser.adRemovalExpiresAt;
        token.adRemovalExpiresAt = adRemovalDate ? new Date(adRemovalDate).toISOString() : null;

        const dailyRewardDate = dbUser.dailyRewardLastClaimed;
        token.dailyRewardLastClaimed = dailyRewardDate ? new Date(dailyRewardDate).toISOString() : null;

      } catch (error) {
        console.error("Error in JWT callback, returning existing token to avoid session loss:", error);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.discordId = token.discordId as string;
        session.user.admin = token.admin as boolean;
        session.user.isVip = token.isVip as boolean;
        session.user.canPost = token.canPost as boolean;
        session.user.canViewStream = token.canViewStream as boolean;
        session.user.adRemovalExpiresAt = token.adRemovalExpiresAt as string | null;
        session.user.dailyRewardLastClaimed = token.dailyRewardLastClaimed as string | null;
        
        try {
          const client = await clientPromise;
          const db = client.db("timaocord");
          const wallet = await db.collection("wallets").findOne({ userId: token.discordId as string });
          session.user.balance = wallet ? wallet.balance : 0;
          
          const levelData = await getUserLevel(token.discordId as string);
          session.user.level = levelData;

          const levelConfig = await getLevelConfig();
          const requiredBolaoLevel = levelConfig.find(l => l.unlocksFeature === 'bolao')?.level ?? Infinity;
          const requiredMvpLevel = levelConfig.find(l => l.unlocksFeature === 'mvp')?.level ?? Infinity;

          session.user.canAccessBolao = levelData.level >= requiredBolaoLevel;
          session.user.canAccessMvp = levelData.level >= requiredMvpLevel;

        } catch (error) {
            console.error("Failed to fetch user balance/level for session:", error);
            session.user.balance = 0;
            session.user.level = { level: 1, levelName: 'Iniciante', xp: 0, xpForNextLevel: 500, progress: 0 };
            session.user.canAccessBolao = false;
            session.user.canAccessMvp = false;
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
