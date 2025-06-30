
'use server';

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { translateMarketData } from '@/lib/translations';
import { getAvailableUpdateApiKey, setLastUpdateTimestamp } from './settings-actions';
import type { Market } from '@/types';

// Simplified types for API response
interface ApiFixture {
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      short: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  bookmakers?: {
    id: number;
    name: string;
    bets: ApiOdd[];
  }[];
}

interface ApiOdd {
    id: number;
    name: string;
    values: { value: string; odd: string }[];
}

// Function to fetch fixtures and odds for a given date from the external API
async function fetchFixturesAndOdds(leagueId: number, season: number, date: string) {
    const apiKey = await getAvailableUpdateApiKey();
    // By adding the bookmaker to the fixtures endpoint, we get odds in the same call.
    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}&date=${date}&timezone=America/Sao_Paulo&bookmaker=8`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        cache: 'no-store' as RequestCache
    };
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API error fetching fixtures for league ${leagueId} on ${date}: ${response.statusText}`, errorData);
        // Don't throw, just return empty array to not halt the entire process for one league.
        return []; 
    }
    const data = await response.json();
    return data.response as ApiFixture[];
}


// The main function to be called by the cron job
export async function updateFixturesFromApi() {
    console.log('Starting optimized fixture update process...');
    const client = await clientPromise;
    const db = client.db('timaocord');
    const matchesCollection = db.collection('matches');
    const championshipsCollection = db.collection('championships');

    const activeChampionships = await championshipsCollection.find({ isActive: true }).toArray();

    if (activeChampionships.length === 0) {
        const msg = 'No active championships configured. Skipping fixture update.';
        console.log(msg);
        return { success: true, message: msg };
    }
    
    // --- New Optimization Logic ---
    // Check if there are any games currently live or scheduled in our database.
    const nonTerminalStatuses = ['NS', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT'];
    const activeOrUpcomingGamesCount = await matchesCollection.countDocuments({
        status: { $in: nonTerminalStatuses }
    });

    const saoPauloTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const today = saoPauloTime.toISOString().split('T')[0];
    let dates = [today]; // Default to only today

    // If there are active or upcoming games, we should also check for tomorrow's games.
    if (activeOrUpcomingGamesCount > 0) {
        const tomorrowDate = new Date(saoPauloTime);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];
        dates.push(tomorrow);
        console.log("Active games found in DB, checking for today and tomorrow.");
    } else {
        console.log("No active games found in DB. Checking only for today's games to save API calls.");
    }
    // --- End of New Logic ---
    
    let updatedCount = 0;
    let newCount = 0;

    for (const champ of activeChampionships) {
        for (const date of dates) {
            try {
                // Fetch fixtures and odds concurrently for the same league and date
                const fixturesResponse = await fetchFixturesAndOdds(champ.leagueId, champ.season, date);

                if (!fixturesResponse || fixturesResponse.length === 0) {
                    continue; // No games for this league on this date
                }
                
                // Update championship logo/country if missing
                const firstFixture = fixturesResponse[0];
                if (firstFixture && (!champ.logo || !champ.country)) {
                     await championshipsCollection.updateOne(
                        { _id: champ._id },
                        { $set: { 
                            logo: firstFixture.league.logo,
                            country: firstFixture.league.country,
                        }}
                    );
                }
                
                for (const fixture of fixturesResponse) {
                    const isGameFinished = ['FT', 'AET', 'PEN'].includes(fixture.fixture.status.short);
                    const isGameTerminated = ['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(fixture.fixture.status.short);
                    
                    const updateOperation: any = {
                        $set: {
                            homeTeam: fixture.teams.home.name,
                            homeLogo: fixture.teams.home.logo,
                            awayTeam: fixture.teams.away.name,
                            awayLogo: fixture.teams.away.logo,
                            league: fixture.league.name,
                            timestamp: fixture.fixture.timestamp,
                            status: fixture.fixture.status.short,
                            goals: fixture.goals,
                            isFinished: isGameFinished,
                        },
                        $setOnInsert: {
                            markets: [], // Default to empty array on insert
                            isNotificationSent: false,
                        }
                    };
                    
                    // Only update markets if the game is still open for betting
                    if (!isGameFinished && !isGameTerminated && fixture.bookmakers && fixture.bookmakers.length > 0) {
                        const bookmaker = fixture.bookmakers.find((b: any) => b.id === 8);
                        if (bookmaker && bookmaker.bets) {
                            const markets: Market[] = bookmaker.bets.map((bet: ApiOdd) => ({
                                name: bet.name,
                                odds: bet.values.map(v => ({ label: v.value, value: v.odd }))
                            })).map(translateMarketData);
                            
                            if (markets.length > 0) {
                                updateOperation.$set.markets = markets;
                            }
                        }
                    }
                    
                    const result = await matchesCollection.updateOne(
                        { _id: fixture.fixture.id },
                        updateOperation,
                        { upsert: true }
                    );

                    if (result.upsertedCount > 0) newCount++;
                    else if (result.modifiedCount > 0) updatedCount++;
                }

            } catch (e) {
                 console.error(`Failed to process fixtures for league ${champ.name} (${champ.leagueId}) on ${date}:`, e);
            }
        }
    }

    await setLastUpdateTimestamp();
    
    const message = `Fixture update complete. New: ${newCount}, Updated: ${updatedCount}.`;
    console.log(message);
    revalidatePath('/bet');
    return { success: true, message };
}
