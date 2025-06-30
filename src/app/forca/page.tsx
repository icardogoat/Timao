
'use server';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Puzzle, Trophy, Brain } from 'lucide-react';

export default async function ForcaPage() {
  return (
    <AppLayout>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight">Forca Corinthiana</h1>
          <p className="text-muted-foreground">Teste seus conhecimentos e adivinhe a palavra!</p>
        </div>
        
        <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
                <Puzzle className="mx-auto h-12 w-12 text-primary" />
                <CardTitle className="mt-4">Como Jogar?</CardTitle>
                <CardDescription>
                    O jogo acontece inteiramente no nosso servidor do Discord.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Trophy className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold">Participe e Ganhe</h3>
                        <p className="text-sm text-muted-foreground">
                            Quando o jogo começar no Discord, digite letras no chat para adivinhar a palavra. O primeiro a acertar leva um prêmio!
                        </p>
                    </div>
                     <div className="space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Brain className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold">Use as Dicas</h3>
                        <p className="text-sm text-muted-foreground">
                            Cada palavra vem com uma dica para te ajudar. Se a rodada estiver difícil, o bot também revelará letras extras.
                        </p>
                    </div>
                     <div className="space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Puzzle className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold">Três Rodadas</h3>
                        <p className="text-sm text-muted-foreground">
                           Cada sessão do jogo tem 3 rodadas com palavras diferentes. Você tem 5 vidas por rodada. Não desista!
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
