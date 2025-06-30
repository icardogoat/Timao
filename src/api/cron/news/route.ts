// This file is obsolete. The news sync cron job is now located at /app/api/cron/news/route.ts
// and syncs from Discord.
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({ 
        success: true, 
        message: "This cron endpoint is deprecated. Please use /app/api/cron/news." 
    });
}
