
import type { ObjectId } from "mongodb";

export type Team = {
  name: string;
  logo: string;
};

export type Odd = {
  label: string;
  value: string;
};

export type Market = {
  name: string;
  odds: Odd[];
};

export type Match = {
  id: number;
  teamA: Team;
  teamB: Team;
  time: string;
  league: string;
  markets: Market[];
  status: string;
  goals: {
    home: number | null;
    away: number | null;
  };
  isFinished: boolean;
  isNotificationSent?: boolean;
  timestamp: number;
};

export type BetInSlip = {
  id: string; 
  matchId: number;
  matchTime: string;
  teamA: string;
  teamB: string;
  league: string;
  marketName: string;
  odd: Odd;
};

export type PlacedBet = {
  _id: string | ObjectId; 
  userId: string;
  bets: { 
    matchId: number;
    matchTime: string;
    teamA: string;
    teamB: string;
    league: string;
    marketName: string;
    selection: string;
    oddValue: string;
    status?: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Anulada';
  }[];
  stake: number;
  potentialWinnings: number;
  totalOdds: number;
  status: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Cancelada';
  createdAt: Date | string;
  settledAt?: Date | string;
};

export type UserStats = {
  userId: string;
  totalWagered: number;
  totalBets: number;
  totalWinnings: number;
  totalLosses: number;
  betsWon: number;
  betsLost: number; 
};

export type Notification = {
  _id: string | ObjectId;
  userId: string;
  title: string;
  description: string;
  date: Date | string;
  read: boolean;
  link?: string;
  isPriority?: boolean;
};

export type UserRanking = {
  rank: number;
  discordId: string;
  avatar: string;
  name: string;
  winnings: number;
  isVip?: boolean;
};

export type ActiveBettorRanking = {
  rank: number;
  discordId: string;
  avatar: string;
  name: string;
  totalBets: number;
  isVip?: boolean;
};

export type TopLevelUserRanking = {
  rank: number;
  discordId: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  isVip?: boolean;
};

export type RichestUserRanking = {
  rank: number;
  discordId: string;
  avatar: string;
  name: string;
  balance: number;
  isVip?: boolean;
};

export type LevelThreshold = {
    level: number;
    xp: number;
    name: string;
    rewardType: 'none' | 'money' | 'role';
    rewardAmount?: number;
    rewardRoleId?: string;
    unlocksFeature?: 'none' | 'bolao' | 'mvp';
};

export type UserLevel = {
  level: number;
  levelName: string;
  xp: number;
  xpForNextLevel: number;
  progress: number;
};

export type Transaction = {
  id: string;
  type: 'Depósito' | 'Saque' | 'Aposta' | 'Prêmio' | 'Bônus' | 'Loja' | 'Ajuste';
  description: string;
  amount: number;
  date: string;
  status: 'Concluído' | 'Pendente' | 'Cancelado';
};

export type Wallet = {
    id: string;
    userId: string;
    balance: number;
    transactions: Transaction[];
};

export type StoreItem = {
  _id: string | ObjectId;
  name: string;
  description: string;
  price: number;
  type: 'ROLE' | 'XP_BOOST' | 'AD_REMOVAL';
  duration?: 'PERMANENT' | 'MONTHLY';
  durationInDays?: number;
  roleId?: string;
  xpAmount?: number;
  isActive: boolean;
  stock?: number;
  createdAt: Date | string;
};

export type UserInventoryItem = {
    _id: string | ObjectId;
    userId: string;
    itemId: string | ObjectId;
    itemName: string;
    pricePaid: number;
    itemType: StoreItem['type'];
    itemDuration?: StoreItem['duration'];
    redemptionCode: string;
    isRedeemed: boolean;
    purchasedAt: Date | string;
    redeemedAt?: Date | string;
    expiresAt?: Date | string;
};

export type PendingReward = {
    _id: string | ObjectId;
    userId: string;
    type: 'role';
    roleId: string;
    reason: string;
    createdAt: Date | string;
};

export type Bolao = {
    _id: string | ObjectId;
    matchId: number;
    homeTeam: string;
    awayTeam: string;
    homeLogo?: string;
    awayLogo?: string;
    league: string;
    matchTime: string;
    entryFee: number;
    prizePool: number;
    status: 'Aberto' | 'Pago' | 'Cancelado';
    participants: {
        userId: string;
        name: string;
        avatar: string;
        guess: { home: number, away: number };
        guessedAt: Date | string;
    }[];
    finalScore?: {
        home: number;
        away: number;
    };
    winners?: {
        userId: string;
        prize: number;
    }[];
    createdAt: Date | string;
}

export type MvpPlayer = {
    id: number;
    name: string;
    photo: string;
}

export type MvpTeamLineup = {
    teamId: number;
    teamName: string;
    teamLogo: string;
    players: MvpPlayer[];
}

export type MvpVote = {
    userId: string;
    playerId: number;
    votedAt: Date | string;
}

export type MvpVoting = {
    _id: string | ObjectId;
    matchId: number;
    homeTeam: string;
    awayTeam: string;
    homeLogo: string;
    awayLogo: string;
    league: string;
    status: 'Aberto' | 'Finalizado' | 'Cancelado';
    lineups: MvpTeamLineup[];
    votes: MvpVote[];
    mvpPlayerIds?: number[];
    createdAt: Date | string;
    endsAt: Date | string;
    finalizedAt?: Date | string;
}

export type Advertisement = {
  _id: string | ObjectId;
  owner: 'system' | 'user';
  userId?: string; // only if owner is 'user'
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  createdAt: Date | string;
}

export type PurchaseAdminView = UserInventoryItem & {
    userName: string;
    userAvatar: string;
};

export type BotConfig = {
  _id: string | ObjectId;
  guildId: string;
  guildInviteUrl: string;
  welcomeChannelId: string;
  logChannelId: string;
  bettingChannelId: string;
  winnersChannelId: string;
  bolaoChannelId: string;
  mvpChannelId: string;
  levelUpChannelId?: string;
  eventChannelId?: string;
  forcaChannelId?: string;
  newsChannelId: string;
  newsMentionRoleId: string;
  adminRoleId: string;
  moderationLogChannelId?: string;
  vipRoleIds: string[];
  postCreatorRoleId?: string;
  streamViewerRoleId?: string;
  playerGameSchedule?: string[];
  forcaSchedule?: string[];
  playerGameLastScheduledTriggers?: Record<string, string>;
  forcaLastScheduledTriggers?: Record<string, string>;
};

export type ApiKeyEntry = {
  id: string;
  key: string;
  usage: number;
  lastReset: Date | string;
};

export type DailyRewardAd = {
  id: string;
  name: string;
  url: string;
};

export type ApiSettings = {
    _id: string | ObjectId;
    siteUrl?: string;
    updateApiKeys?: ApiKeyEntry[];
    paymentApiKeys?: ApiKeyEntry[];
    lastUpdateTimestamp?: Date | string | null;
    highlightedLeagues?: string[];
    dailyRewardAds?: DailyRewardAd[];
};

export type SiteSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceExpectedReturn: string;
  welcomeBonus: number;
  betaVipMode: boolean;
};

// Simplified Author Info, populated from the User collection
export type AuthorInfo = {
    _id: string | ObjectId;
    name: string;
    avatarUrl: string;
}

export type Post = {
  _id: string | ObjectId;
  authorId: string; // This will now be the user's discordId
  title: string;
  content: string;
  imageUrl?: string | null;
  isPinned: boolean;
  publishedAt: Date | string;
  discordMessageId?: string;
  author?: AuthorInfo; // Populated field from 'users' collection
};

export type Invite = {
  _id: string | ObjectId;
  guildId: string;
  inviterId: string;
  inviteeId: string;
  timestamp: Date | string;
};

export type InviterRanking = {
  rank: number;
  inviterId: string;
  name: string;
  avatar: string;
  inviteCount: number;
  isVip?: boolean;
};
    
export type BetVolumeData = {
    date: string;
    totalWagered: number;
    totalBets: number;
}[];

export type ProfitLossData = {
    date: string;
    wagered: number;
    winnings: number;
    profit: number;
}[];

export type StreamSource = {
  id: string;
  name: string;
  type: 'iframe' | 'hls';
  url: string; 
};

export type LiveStream = {
  _id: string | ObjectId;
  name: string;
  sources: StreamSource[];
  isIntervalActive?: boolean;
  createdAt: Date | string;
};

export type SiteEvent = {
  _id: string | ObjectId;
  name: string;
  description: string;
  xpMultiplier: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type DbStats = {
    db: string;
    collections: number;
    objects: number;
    dataSize: string; // in MB
    storageSize: string; // in MB
    totalSize: string; // in MB
};

export type DashboardStats = {
    totalWagered: number;
    activeUsers: number;
    totalBets: number;
    grossProfit: number;
};

export type TopBettor = {
    name: string;
    email: string;
    avatar: string;
    totalWagered: number;
    isVip?: boolean;
};

export type RecentBet = {
    userName: string;
    userEmail: string;
    matchDescription: string;
    status: 'Em Aberto' | 'Ganha' | 'Perdida' | 'Cancelada';
    stake: number;
};

export type RecentUser = {
  name: string;
  avatar: string;
  joinDate: string;
};

export type PromoCode = {
  _id: string | ObjectId;
  code: string;
  type: 'MONEY' | 'XP' | 'ROLE' | 'DAILY';
  description: string;
  value: number | string; // amount for money/xp, roleId for role
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'REVOKED';
  maxUses?: number | null; // null for unlimited uses
  redeemedBy?: string[]; // Array of user IDs who have redeemed it
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  createdBy: string; // discordId of admin or 'SYSTEM'
};

export type QuizQuestion = {
    question: string;
    options: string[];
    answer: number; // index of the correct option
};

export type Quiz = {
    _id: string | ObjectId;
    name: string;
    description: string;
    rewardPerQuestion: number;
    questionsPerGame: number;
    winnerLimit: number; // 0 for unlimited
    channelId: string;
    mentionRoleId?: string;
    schedule?: string[];
    lastScheduledTriggers?: Record<string, string>; // e.g., { '10:00': '2024-07-30' }
    createdBy: string;
    createdAt: Date | string;
};

export type Championship = {
  _id: string | ObjectId;
  name: string;
  leagueId: number;
  season: number;
  country?: string;
  logo?: string;
  isActive: boolean;
  createdAt: Date | string;
};

export type GuildDetails = {
    id: string;
    name: string;
    iconUrl: string | null;
    memberCount: number;
    onlineCount: number;
    boostTier: number;
    boostCount: number;
    createdAt: string;
};

export type RoleWithMemberCount = {
    id: string;
    name: string;
    memberCount: number;
    color: number;
};

export type MemberActivityStats = {
    daily: { joins: number; leaves: number; net: number };
    weekly: { joins: number; leaves: number; net: number };
    monthly: { joins: number; leaves: number; net: number };
    annual: { joins: number; leaves: number; net: number };
    chartData: { date: string; joins: number; leaves: number }[];
};

export type PlayerGuessingGame = {
    _id: string | ObjectId;
    playerName: string;
    hints: string[];
    nationality: string; // e.g., 'br', 'ar' for flag emojis
    channelId?: string;
    status: 'draft' | 'active' | 'finished';
    prizeAmount: number;
    createdBy: string; // admin userId
    createdAt: Date | string;
    startedAt?: Date | string;
    winnerId?: string;
    winnerName?: string;
    winnerAvatar?: string;
};

export type ForcaGameWord = {
  _id: string | ObjectId;
  word: string;
  hint: string;
  createdBy: string; // admin userId
  createdAt: Date | string;
};

export type ModerationAction = {
    _id: string | ObjectId;
    userId: string;
    userName: string;
    userAvatar: string;
    moderatorId: string;
    moderatorName: string;
    type: 'WARN' | 'MUTE' | 'BAN' | 'UNBAN' | 'UNMUTE' | 'KICK';
    reason: string;
    duration?: string | null;
    expiresAt?: Date | string | null;
    createdAt: Date | string;
};
