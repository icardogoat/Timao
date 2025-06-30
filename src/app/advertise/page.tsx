
import { redirect } from 'next/navigation';

// A funcionalidade de compra de anúncios pelo usuário foi removida.
// Esta página agora redireciona para a página principal de apostas.
export default function AdvertisePage() {
    redirect('/bet');
}
