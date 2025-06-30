
'use server';

import clientPromise from '@/lib/mongodb';
import { getApiSettings } from './settings-actions';
import { getBotConfig } from './bot-config-actions';
import type { Post, AuthorInfo } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import { cache } from 'react';

export async function sendDiscordPostNotification(post: Post, author: AuthorInfo) {
    const { newsChannelId, newsMentionRoleId } = await getBotConfig();
    const { siteUrl } = await getApiSettings();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!newsChannelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        console.log('Discord News channel or bot token not configured. Skipping post notification.');
        return;
    }

    const postUrl = siteUrl ? `${siteUrl}/news/${post._id.toString()}` : undefined;

    const publishedDate = new Date(post.publishedAt).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Sao_Paulo'
    });

    const header = `# 📢 ${post.title}\n\n`;
    const footer = `\n\n---\n📰 *Publicado por: ${author.name}*\n📅 *${publishedDate}*`;
    
    // Discord message content limit is 2000 characters.
    const mention = newsMentionRoleId ? `<@&${newsMentionRoleId}>` : '';
    const maxContentLength = 2000 - header.length - footer.length - mention.length - 2; // -2 for newlines
    
    const truncatedContent = post.content.length > maxContentLength
        ? post.content.substring(0, maxContentLength - 3) + '...'
        : post.content;
    
    const messageContent = `${header}${truncatedContent}${footer}`;
    
    const imageEmbed = post.imageUrl ? [{
        url: postUrl, // Link the image to the post
        image: {
            url: post.imageUrl
        }
    }] : [];

    const components = postUrl ? [{
        type: 1, // Action Row
        components: [{
            type: 2, // Button
            style: 5, // Link
            label: 'Ler post completo',
            url: postUrl
        }]
    }] : [];

    const finalPayload = {
        content: `${messageContent}\n${mention}`,
        embeds: imageEmbed,
        components: components,
        allowed_mentions: {
            parse: ['roles']
        }
    };

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bot ${botToken}` },
            body: JSON.stringify(finalPayload),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send post notification to Discord:', JSON.stringify(errorData, null, 2));
        } else {
            console.log(`Successfully sent notification for post: "${post.title}"`);
        }
    } catch (error) {
        console.error('Error sending post notification to Discord:', error);
    }
}


export async function getPublicPosts(): Promise<Post[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const postsCollection = db.collection<Post>('posts');
        const posts = await postsCollection.aggregate([
            { $sort: { isPinned: -1, publishedAt: -1 } },
            { $limit: 20 },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    content: { $substrCP: ["$content", 0, 150] }, // Truncate content for card view
                    imageUrl: 1,
                    isPinned: 1,
                    publishedAt: 1,
                    authorId: 1,
                }
            }
        ]).toArray();

        return JSON.parse(JSON.stringify(posts));
    } catch (error) {
        console.error("Error fetching public posts from DB:", error);
        return [];
    }
}

export async function getPostById(id: string): Promise<Post | null> {
    if (!ObjectId.isValid(id)) {
        return null;
    }

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const postsCollection = db.collection<Post>('posts');
        
        const post = await postsCollection.findOne({ _id: new ObjectId(id) });
        
        if (!post) {
            return null;
        }

        return JSON.parse(JSON.stringify(post));
    } catch (error) {
        console.error(`Error fetching post by ID ${id}:`, error);
        return null;
    }
}

export const getAuthorInfo = cache(async (authorId: string): Promise<AuthorInfo | null> => {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const user = await db.collection('users').findOne(
            { discordId: authorId },
            { projection: { _id: 1, name: 1, image: 1 } }
        );

        if (!user) return null;

        return {
            _id: user._id,
            name: user.name,
            avatarUrl: user.image,
        };
    } catch (error) {
        console.error('Error fetching author info:', error);
        return null;
    }
});


export async function syncDiscordNews(): Promise<{ success: boolean; message: string; details: string[] }> {
    const { newsChannelId } = await getBotConfig();
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!newsChannelId || !botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
        const msg = 'Canal de notícias do Discord ou token do bot não configurado. Sincronização ignorada.';
        console.log(msg);
        return { success: false, message: msg, details: [] };
    }

    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const postsCollection = db.collection('posts');
        const usersCollection = db.collection('users');

        // Fetch last 50 messages from the news channel
        const response = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages?limit=50`, {
            headers: { 'Authorization': `Bot ${botToken}` },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Falha ao buscar mensagens do Discord: ${JSON.stringify(errorData)}`);
        }

        const messages: any[] = await response.json();
        let importedCount = 0;
        const details: string[] = [];

        // Process messages from oldest to newest to maintain order
        for (const message of messages.reverse()) {
            // Skip messages from bots or without content
            if (message.author.bot || !message.content) {
                continue;
            }

            // Check if post already exists by discordMessageId
            const existingPost = await postsCollection.findOne({ discordMessageId: message.id });
            if (existingPost) {
                continue;
            }

            // Check if the author is a registered user on the site
            const authorInDb = await usersCollection.findOne({ discordId: message.author.id });
            if (!authorInDb) {
                details.push(`Mensagem de ${message.author.username} ignorada (usuário não registrado).`);
                continue;
            }

            const lines = message.content.trim().split('\n');
            const title = lines[0];
            const content = lines.slice(1).join('\n');
            const imageUrl = message.attachments?.[0]?.url || null;

            // Don't import if title is empty
            if (!title) {
                details.push(`Mensagem ${message.id} ignorada (título vazio).`);
                continue;
            }

            const newPost: Omit<Post, '_id' | 'author'> = {
                title,
                content: content || " ", // Ensure content is not empty for consistency
                imageUrl,
                authorId: authorInDb.discordId,
                discordMessageId: message.id,
                isPinned: false,
                publishedAt: new Date(message.timestamp),
            };

            await postsCollection.insertOne(newPost as any);
            importedCount++;
            details.push(`Post importado: "${title}"`);
        }
        
        if (importedCount > 0) {
            revalidatePath('/news');
            revalidatePath('/');
            revalidatePath('/admin/announcements');
        }

        return {
            success: true,
            message: `Sincronização concluída. ${importedCount} novo(s) post(s) importado(s).`,
            details,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error syncing news from Discord:", error);
        return { success: false, message: "Falha na sincronização com o Discord.", details: [errorMessage] };
    }
}
