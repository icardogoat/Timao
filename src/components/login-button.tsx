'use client';

import { signIn, useSession } from 'next-auth/react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LoginButton() {
  const { status } = useSession();

  if (status === 'authenticated') {
    return (
      <Link href="/bet" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}>
        Acessar FielBet
        <ArrowRight className="ml-2 h-5 w-5" />
      </Link>
    );
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={() => signIn('discord', { callbackUrl: '/bet' })}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? (
        'Carregando...'
      ) : (
        <>
          Acessar FielBet
          <ArrowRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
