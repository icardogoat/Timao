
'use server';

import AdminPostsClient from "@/components/admin-announcements-client";
import { getAdminPosts } from "@/actions/admin-actions";

export default async function AdminPostsPage() {
    const posts = await getAdminPosts();
    return <AdminPostsClient initialPosts={posts} />;
}
