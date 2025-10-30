import type { NewWallet, Wallet } from "@/db/schema";
import { transactions, wallets } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

export class WalletService {
    constructor(private db: ReturnType<typeof drizzle>) {}

    // Create a new wallet
    async create(
        wallet: Omit<NewWallet, "id" | "createdAt" | "updatedAt">,
    ): Promise<Wallet> {
        const id = crypto.randomUUID();
        const now = new Date();

        const [newWallet] = await this.db
            .insert(wallets)
            .values({
                ...wallet,
                id,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        return newWallet;
    }

    // Get all wallets
    async getAll(includeInactive = false): Promise<Wallet[]> {
        if (includeInactive) {
            return await this.db
                .select()
                .from(wallets)
                .orderBy(desc(wallets.createdAt));
        }

        return await this.db
            .select()
            .from(wallets)
            .where(eq(wallets.isActive, true))
            .orderBy(desc(wallets.createdAt));
    }

    // Get wallet by ID
    async getById(id: string): Promise<Wallet | undefined> {
        const [wallet] = await this.db
            .select()
            .from(wallets)
            .where(eq(wallets.id, id))
            .limit(1);

        return wallet;
    }

    // Get wallets by type
    async getByType(type: string): Promise<Wallet[]> {
        return await this.db
            .select()
            .from(wallets)
            .where(and(eq(wallets.type, type), eq(wallets.isActive, true)))
            .orderBy(desc(wallets.createdAt));
    }

    // Update wallet
    async update(
        id: string,
        data: Partial<Omit<Wallet, "id" | "createdAt">>,
    ): Promise<Wallet> {
        const [updated] = await this.db
            .update(wallets)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(wallets.id, id))
            .returning();

        return updated;
    }

    // Update wallet balance
    async updateBalance(id: string, amount: number): Promise<Wallet> {
        const [updated] = await this.db
            .update(wallets)
            .set({
                balance: sql`${wallets.balance} + ${amount}`,
                updatedAt: new Date(),
            })
            .where(eq(wallets.id, id))
            .returning();

        return updated;
    }

    // Recalculate wallet balance from transactions
    async recalculateBalance(walletId: string): Promise<Wallet> {
        // Calculate from income and expense transactions
        const result = await this.db
            .select({
                income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
                expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
                transferOut: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'transfer' THEN ${transactions.amount} + ${transactions.transferFee} ELSE 0 END), 0)`,
                transferIn: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.toWalletId} = ${walletId} THEN ${transactions.amount} ELSE 0 END), 0)`,
            })
            .from(transactions)
            .where(eq(transactions.walletId, walletId));

        const { income, expense, transferOut, transferIn } = result[0];
        const balance = income - expense - transferOut + transferIn;

        return await this.update(walletId, { balance });
    }

    // Soft delete wallet
    async softDelete(id: string): Promise<Wallet> {
        return await this.update(id, { isActive: false });
    }

    // Hard delete wallet (will cascade delete transactions)
    async delete(id: string): Promise<void> {
        await this.db.delete(wallets).where(eq(wallets.id, id));
    }

    // Get credit card info with current usage
    async getCreditCardInfo(id: string) {
        const wallet = await this.getById(id);
        if (!wallet || wallet.type !== "credit_card") {
            throw new Error("Wallet is not a credit card");
        }

        const currentUsage = Math.abs(wallet.balance); // Balance is negative for credit cards
        const availableCredit = (wallet.creditLimit || 0) - currentUsage;
        const utilizationRate = wallet.creditLimit
            ? (currentUsage / wallet.creditLimit) * 100
            : 0;

        return {
            ...wallet,
            currentUsage,
            availableCredit,
            utilizationRate,
            isOverLimit: currentUsage > (wallet.creditLimit || 0),
        };
    }

    // Get total balance across all wallets (excluding credit cards)
    async getTotalBalance(): Promise<number> {
        const result = await this.db
            .select({
                total: sql<number>`COALESCE(SUM(${wallets.balance}), 0)`,
            })
            .from(wallets)
            .where(
                and(
                    eq(wallets.isActive, true),
                    sql`${wallets.type} != 'credit_card'`,
                ),
            );

        return result[0].total;
    }

    // Get total credit card debt
    async getTotalCreditCardDebt(): Promise<number> {
        const result = await this.db
            .select({
                total: sql<number>`COALESCE(SUM(ABS(${wallets.balance})), 0)`,
            })
            .from(wallets)
            .where(
                and(
                    eq(wallets.isActive, true),
                    eq(wallets.type, "credit_card"),
                ),
            );

        return result[0].total;
    }
}
