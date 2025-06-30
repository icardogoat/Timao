import { redirect } from 'next/navigation';

// This page has been removed in favor of the new admin-controlled stream system.
export default function MyStreamPage() {
    redirect('/bet');
}
