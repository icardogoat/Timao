
import { redirect } from 'next/navigation';

export default function AdminStandingsRedirectPage() {
    // Esta página foi descontinuada e agora redireciona para o dashboard.
    redirect('/admin/dashboard');
}
