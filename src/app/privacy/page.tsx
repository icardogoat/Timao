
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="text-3xl">Política de Privacidade</CardTitle>
                    <CardDescription>Última atualização: {new Date().toLocaleDateString('pt-BR')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <h2 className="font-semibold text-lg text-foreground">1. Coleta de Informações</h2>
                    <p>
                        Coletamos informações que você nos fornece diretamente ao se registrar, como seu ID de usuário do Discord, nome de usuário e endereço de e-mail. Também coletamos dados sobre sua atividade na plataforma, como apostas realizadas e transações.
                    </p>
                    <h2 className="font-semibold text-lg text-foreground">2. Uso das Informações</h2>
                    <p>
                        Usamos as informações coletadas para operar, manter e fornecer os recursos e funcionalidades da Plataforma, para nos comunicarmos com você e para personalizar sua experiência.
                    </p>
                    <h2 className="font-semibold text-lg text-foreground">3. Compartilhamento de Informações</h2>
                    <p>
                        Não compartilhamos suas informações pessoais com terceiros, exceto conforme necessário para operar a plataforma (por exemplo, com provedores de autenticação como o Discord) ou se exigido por lei. Seu nome de usuário e avatar podem ser visíveis publicamente em rankings.
                    </p>
                    <h2 className="font-semibold text-lg text-foreground">4. Segurança</h2>
                    <p>
                        Tomamos medidas razoáveis para proteger suas informações contra acesso não autorizado ou divulgação. No entanto, nenhum método de transmissão pela Internet é 100% seguro.
                    </p>
                     <h2 className="font-semibold text-lg text-foreground">5. Seus Direitos</h2>
                    <p>
                        Você pode ter o direito de acessar, corrigir ou excluir suas informações pessoais. Entre em contato conosco para fazer tais solicitações.
                    </p>
                    <h2 className="font-semibold text-lg text-foreground">6. Alterações na Política</h2>
                    <p>
                        Podemos atualizar nossa Política de Privacidade de tempos em tempos. Notificaremos você sobre quaisquer alterações, publicando a nova Política de Privacidade nesta página.
                    </p>
                     <div className="pt-4">
                        <Link href="/" className="text-primary hover:underline">Voltar para a página inicial</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
