import { NextResponse } from 'next/server';
import { processAllFinishedMatches } from '@/actions/admin-actions';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await processAllFinishedMatches();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job for match processing failed:', error);
    return NextResponse.json({ success: false, message: 'Cron job failed', error: (error as Error).message }, { status: 500 });
  }
}
