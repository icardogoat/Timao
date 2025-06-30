
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { getLevelConfig } from '@/actions/level-actions';

interface LockedFeatureCardProps {
    feature: 'bolao' | 'mvp';
}

export async function LockedFeatureCard({ feature }: LockedFeatureCardProps) {
    const levelConfig = await getLevelConfig();
    const requiredLevel = levelConfig.find(l => l.unlocksFeature === feature)?.level;
    const featureName = feature === 'bolao' ? 'Bolão' : 'Votação MVP';

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                        <Lock className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="mt-4">{featureName} Bloqueado</CardTitle>
                    <CardDescription>
                        {requiredLevel
                            ? `Você precisa alcançar o Nível ${requiredLevel} para desbloquear este recurso.`
                            : 'Este recurso está temporariamente indisponível.'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/profile">Ver meu Perfil</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
