import type { Advertisement } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from './ui/badge';

interface InFeedAdCardProps {
  ad: Advertisement;
}

export function InFeedAdCard({ ad }: InFeedAdCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden h-full">
      <Link href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col h-full group">
        <CardHeader className="p-0 relative">
          <Image
            src={ad.imageUrl}
            alt={ad.title}
            width={400}
            height={200}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint="advertisement banner"
          />
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">Anúncio</Badge>
        </CardHeader>
        <CardContent className="p-4 flex-grow bg-card">
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">{ad.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
