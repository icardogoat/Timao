
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="text-3xl">Termos e Condições</CardTitle>
                    <CardDescription>Última atualização: {new Date().toLocaleDateString('pt-BR')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <h2 className="font-semibold text-lg text-foreground">1. Introdução</h2>
                    <p>
                        Bem-vindo ao Timaocord ("Plataforma"). Estes Termos e Condições regem o seu uso da nossa plataforma de apostas e comunidade. Ao acessar ou usar a Plataforma, você concorda em cumprir estes termos.
                    </p>
                    <h2 className="font-semibold text-lg text-foreground">2. Elegibilidade</h2>
                    <p>
                        Você deve ter 18 anos ou mais para usar esta Plataforma. Ao usar a Plataforma, você declara e garante que tem idade legal para formar um contrato vinculativo.
                    </p>
                    <h2 className="font-semibold text-lg text-foreground">3. Conduta do Usuário</h2>
                    <p>
                        Você concorda em não usar a Plataforma para qualquer finalidade ilegal ou proibida. Você é responsável por toda a sua atividade na Plataforma. É estritamente proibido o uso de bots, automação ou qualquer forma de trapaça.
                    </p>
                    <h2 className="font-semibold text-lg text-foreground">4. Moeda da Plataforma</h2>
                    <p>
                        A moeda utilizada na plataforma é virtual e não possui valor monetário real. Ela é destinada apenas para fins de entretenimento dentro da plataforma e não pode ser trocada por dinheiro real.
                    </p>
                     <h2 className="font-semibold text-lg text-foreground">5. Limitação de Responsabilidade</h2>
                    <p>
                        A Plataforma é fornecida "como está", sem garantias de qualquer tipo. Não nos responsabilizamos por quaisquer perdas ou danos decorrentes do seu uso da Plataforma.
                    </p>
                    <h2 className="font-semibold text-lg text-foreground">6. Alterações nos Termos</h2>
                    <p>
                        Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos os usuários sobre quaisquer alterações. O uso continuado da Plataforma após tais alterações constitui sua aceitação dos novos termos.
                    </p>
                    <div className="pt-4">
                        <Link href="/" className="text-primary hover:underline">Voltar para a página inicial</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
