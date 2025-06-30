
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // News cleanup is now handled by Discord message history.
  // Casino functionality is removed.
  const message = `Cleanup job ran successfully. No actions are currently configured.`;
  console.log(message);
  return NextResponse.json({ success: true, message });
}
