
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const message = "The quiz scheduler cron job is now handled by the Discord bot (cogs/tasks.py) and this endpoint is deprecated. You can remove this cron job from your service.";
  console.log(message);
  return NextResponse.json({ success: true, message });
}
