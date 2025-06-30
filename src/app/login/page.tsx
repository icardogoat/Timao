import { redirect } from 'next/navigation';

// The dedicated login page has been removed.
// All login actions now originate from the homepage.
export default function LoginPage() {
    redirect('/');
}
