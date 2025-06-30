
'use server';

import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Transaction, StoreItem, UserInventoryItem, Notification } from '@/types';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';
import { grantAchievement } from './achievement-actions';

// This function returns serializable store item data for the public store page.
export async function getStoreItems(): Promise<Omit<StoreItem, '_id' | 'createdAt'> & { id: string }[]> {
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const items = await db.collection<StoreItem>('store_items')
            .find({ isActive: true })
            .sort({ price: 1 })
            .toArray();

        // Convert to serializable format
        return items.map(item => ({
            id: item._id.toString(),
            name: item.name,
            description: item.description,
            price: item.price,
            type: item.type,
            duration: item.duration,
            durationInDays: item.durationInDays,
            roleId: item.roleId,
            xpAmount: item.xpAmount,
            isActive: item.isActive,
        }));
    } catch (error) {
        console.error("Error fetching store items:", error);
        return [];
    }
};

export async function getUserInventory(userId: string): Promise<UserInventoryItem[]> {
    if (!userId) return [];
    try {
        const client = await clientPromise;
        const db = client.db('timaocord');
        const inventory = await db.collection<UserInventoryItem>('user_inventory')
            .find({ userId })
            .toArray();

        // Convert to serializable format
        return JSON.parse(JSON.stringify(inventory));
    } catch (error) {
        console.error("Error fetching user inventory:", error);
        return [];
    }
}


interface PurchaseResult {
    success: boolean;
    message: string;
    redemptionCode?: string;
}

const VIP_DISCOUNT_MULTIPLIER = 0.9; // 10% discount

function generateRedemptionCode(): string {
  // Generates a random 8-character uppercase alphanumeric string
  return randomBytes(4).toString('hex').toUpperCase();
}


export async function purchaseItem(itemId: string): Promise<PurchaseResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
        return { success: false, message: 'Você precisa estar logado para comprar.' };
    }

    const userId = session.user.discordId;
    const isVip = session.user.isVip;

    const client = await clientPromise;
    const db = client.db('timaocord');
    
    const item = await db.collection<StoreItem>('store_items').findOne({ _id: new ObjectId(itemId) });

    if (!item || !item.isActive) {
        return { success: false, message: 'Item não encontrado ou indisponível.' };
    }

    // Check if user already owns an active version of this item
    if (item.type === 'ROLE') {
        const inventoryCollection = db.collection<UserInventoryItem>('user_inventory');
        const userInventory = await inventoryCollection.find({ userId, itemId: item._id }).toArray();

        for (const ownedItem of userInventory) {
            if (ownedItem.itemDuration === 'PERMANENT') {
                return { success: false, message: 'Você já possui este item permanentemente.' };
            }
            if (ownedItem.itemDuration === 'MONTHLY' && ownedItem.expiresAt && new Date(ownedItem.expiresAt) > new Date()) {
                const expiryDate = new Date(ownedItem.expiresAt).toLocaleDateString('pt-BR');
                return { success: false, message: `Você já possui uma assinatura ativa para este item, que expira em ${expiryDate}.` };
            }
        }
    }

    if (item.type === 'AD_REMOVAL') {
        const user = await db.collection('users').findOne({ discordId: userId });
        if (user && user.adRemovalExpiresAt && new Date(user.adRemovalExpiresAt) > new Date()) {
            return { success: false, message: 'Você já possui um período de remoção de anúncios ativo.' };
        }
    }


    const finalPrice = isVip && item.type !== 'ROLE' ? item.price * VIP_DISCOUNT_MULTIPLIER : item.price;

    const mongoSession = client.startSession();

    try {
        let result: PurchaseResult | undefined;

        await mongoSession.withTransaction(async () => {
            const walletsCollection = db.collection('wallets');
            const inventoryCollection = db.collection('user_inventory');
            const usersCollection = db.collection('users');

            const userWallet = await walletsCollection.findOne({ userId }, { session: mongoSession });

            if (!userWallet || userWallet.balance < finalPrice) {
                throw new Error('Saldo insuficiente.');
            }
            
            if (item.type === 'XP_BOOST' && item.xpAmount) {
                 await usersCollection.updateOne(
                    { discordId: userId },
                    { $inc: { xp: item.xpAmount } },
                    { session: mongoSession }
                );
                
                result = { success: true, message: `Bônus de ${item.xpAmount} XP aplicado com sucesso!` };

            } else if (item.type === 'AD_REMOVAL' && item.durationInDays) {
                const now = new Date();
                const expiryDate = new Date(new Date().setDate(now.getDate() + item.durationInDays));
                
                await usersCollection.updateOne(
                    { discordId: userId },
                    { $set: { adRemovalExpiresAt: expiryDate } },
                    { session: mongoSession }
                );
                
                // Add to inventory for tracking in admin
                const newInventoryItem: Omit<UserInventoryItem, '_id'> = {
                    userId: userId,
                    itemId: item._id,
                    itemName: item.name,
                    pricePaid: finalPrice,
                    itemType: item.type,
                    isRedeemed: true, // It's applied directly
                    redeemedAt: new Date(),
                    expiresAt: expiryDate,
                    purchasedAt: new Date(),
                    redemptionCode: 'APLICADO_DIRETAMENTE', // No code needed
                };
                await inventoryCollection.insertOne(newInventoryItem as any, { session: mongoSession });

                result = { success: true, message: `Anúncios removidos por ${item.durationInDays} dia(s)!` };

            } else { // For roles or other redeemable items, generate a code
                 // Generate a unique code
                let redemptionCode = '';
                let isCodeUnique = false;
                while (!isCodeUnique) {
                    redemptionCode = generateRedemptionCode();
                    const existingCode = await inventoryCollection.findOne({ redemptionCode }, { session: mongoSession });
                    if (!existingCode) {
                        isCodeUnique = true;
                    }
                }
                
                const newInventoryItem: Omit<UserInventoryItem, '_id'> = {
                    userId: userId,
                    itemId: item._id,
                    itemName: item.name,
                    pricePaid: finalPrice,
                    itemType: item.type,
                    itemDuration: item.duration,
                    redemptionCode: redemptionCode,
                    isRedeemed: false,
                    purchasedAt: new Date(),
                };

                if (item.duration === 'MONTHLY') {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 30);
                    newInventoryItem.expiresAt = expiryDate;
                }

                await inventoryCollection.insertOne(newInventoryItem as any, { session: mongoSession });
                
                result = { success: true, message: `"${item.name}" comprado com sucesso!`, redemptionCode };
            }

            const newTransaction: Transaction = {
                id: new ObjectId().toString(),
                type: 'Loja',
                description: `Compra: ${item.name}`,
                amount: -finalPrice,
                date: new Date().toISOString(),
                status: 'Concluído',
            };

            const newBalance = userWallet.balance - finalPrice;
            await walletsCollection.updateOne(
                { userId },
                {
                    $set: { balance: newBalance },
                    $push: { transactions: { $each: [newTransaction], $sort: { date: -1 } } }
                },
                { session: mongoSession }
            );
        });
        
        await mongoSession.endSession();

        if (result?.success) {
            // Grant achievements
            await grantAchievement(userId, 'first_purchase');
            if (item.type === 'AD_REMOVAL') {
                await grantAchievement(userId, 'ad_remover');
            }

            revalidatePath('/wallet');
            revalidatePath('/store');
            revalidatePath('/profile'); // Revalidate profile in case of XP/Ad purchase
            revalidatePath('/admin/purchases'); // Revalidate admin purchases view
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro ao processar sua compra.' };
    }
}

export async function redeemItemByCode(userId: string, redemptionCode: string): Promise<{ success: boolean; message: string; itemName?: string; roleId?: string; itemType?: StoreItem['type'], duration?: StoreItem['duration'] }> {
    if (!userId || !redemptionCode) {
        return { success: false, message: 'Dados insuficientes para o resgate.' };
    }

    const client = await clientPromise;
    const db = client.db('timaocord');
    const mongoSession = client.startSession();

    try {
        let result: { success: boolean; message: string; itemName?: string; roleId?: string; itemType?: StoreItem['type'], duration?: StoreItem['duration'] } | undefined;

        await mongoSession.withTransaction(async () => {
            const inventoryCollection = db.collection<UserInventoryItem>('user_inventory');
            const storeItemsCollection = db.collection<StoreItem>('store_items');
            const notificationsCollection = db.collection('notifications');

            const code = redemptionCode.toUpperCase();
            const inventoryItem = await inventoryCollection.findOne({ redemptionCode: code }, { session: mongoSession });

            if (!inventoryItem) {
                throw new Error('Código de resgate inválido.');
            }
            if (inventoryItem.userId !== userId) {
                throw new Error('Este código de resgate pertence a outro usuário.');
            }
            if (inventoryItem.isRedeemed) {
                throw new Error('Este código de resgate já foi utilizado.');
            }

            // Mark as redeemed
            const updateResult = await inventoryCollection.updateOne(
                { _id: inventoryItem._id },
                { $set: { isRedeemed: true, redeemedAt: new Date() } },
                { session: mongoSession }
            );

            if (updateResult.modifiedCount === 0) {
                throw new Error('Falha ao atualizar o item no inventário.');
            }
            
            const storeItem = await storeItemsCollection.findOne({ _id: inventoryItem.itemId }, { session: mongoSession });
            if (!storeItem) {
                // This would be an data integrity issue, but we should handle it.
                throw new Error('Item da loja associado não encontrado. Contate um administrador.');
            }

            // Create in-app notification
            const newNotification: Omit<Notification, '_id'> = {
                userId: userId,
                title: '✅ Item Resgatado!',
                description: `Você resgatou com sucesso o item: "${storeItem.name}".`,
                date: new Date(),
                read: false,
                link: '/profile', // Link to profile where they can see their inventory
                isPriority: true,
            };
            await notificationsCollection.insertOne(newNotification as any, { session: mongoSession });
            
            result = { 
                success: true, 
                message: 'Item resgatado com sucesso!',
                itemName: storeItem.name,
                roleId: storeItem.roleId,
                itemType: storeItem.type,
                duration: storeItem.duration,
            };
        });
        
        await mongoSession.endSession();
        
        if (result?.success) {
            revalidatePath('/profile');
            revalidatePath('/notifications');
            revalidatePath('/admin/purchases');
            return result;
        }

        return { success: false, message: 'A transação falhou.' };

    } catch (error: any) {
        await mongoSession.endSession();
        return { success: false, message: error.message || 'Ocorreu um erro desconhecido durante o resgate.' };
    }
}
