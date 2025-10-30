import type { NewTransaction, Transaction } from "@/db/schema";
import { categories, transactions, wallets } from "@/db/schema";
import { and, between, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

export class TransactionService {
    constructor(private db: ReturnType<typeof drizzle>) {}

    // Create a new transaction
    async create(
        transaction: Omit<NewTransaction, "id" | "createdAt" | "updatedAt">,
    ): Promise<Transaction> {
        const id = crypto.randomUUID();
        const now = new Date();

        // Start a transaction to ensure atomicity
        const [newTransaction] = await this.db
            .insert(transactions)
            .values({
                ...transaction,
                id,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        // Update wallet balance
        await this.updateWalletBalance(newTransaction);

        return newTransaction;
    }

    // Helper to update wallet balance based on transaction
    private async updateWalletBalance(transaction: Transaction): Promise<void> {
        if (transaction.type === "income") {
            // Add to wallet
            await this.db
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} + ${transaction.amount}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, transaction.walletId));
        } else if (transaction.type === "expense") {
            // Subtract from wallet
            await this.db
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} - ${transaction.amount}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, transaction.walletId));
        } else if (transaction.type === "transfer" && transaction.toWalletId) {
            // Subtract from source wallet (including fee)
            await this.db
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} - ${transaction.amount} - ${transaction.transferFee || 0}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, transaction.walletId));

            // Add to destination wallet
            await this.db
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} + ${transaction.amount}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, transaction.toWalletId));
        }
    }

    // Get all transactions
    async getAll(limit?: number): Promise<Transaction[]> {
        let query = this.db
            .select()
            .from(transactions)
            .orderBy(desc(transactions.transactionDate));

        if (limit) {
            query = query.limit(limit) as any;
        }

        return await query;
    }

    // Get transaction by ID
    async getById(id: string): Promise<Transaction | undefined> {
        const [transaction] = await this.db
            .select()
            .from(transactions)
            .where(eq(transactions.id, id))
            .limit(1);

        return transaction;
    }

    // Get transactions by wallet
    async getByWallet(
        walletId: string,
        limit?: number,
    ): Promise<Transaction[]> {
        let query = this.db
            .select()
            .from(transactions)
            .where(eq(transactions.walletId, walletId))
            .orderBy(desc(transactions.transactionDate));

        if (limit) {
            query = query.limit(limit) as any;
        }

        return await query;
    }

    // Get transactions by category
    async getByCategory(
        categoryId: string,
        limit?: number,
    ): Promise<Transaction[]> {
        let query = this.db
            .select()
            .from(transactions)
            .where(eq(transactions.categoryId, categoryId))
            .orderBy(desc(transactions.transactionDate));

        if (limit) {
            query = query.limit(limit) as any;
        }

        return await query;
    }

    // Get transactions by date range
    async getByDateRange(
        startDate: Date,
        endDate: Date,
    ): Promise<Transaction[]> {
        return await this.db
            .select()
            .from(transactions)
            .where(between(transactions.transactionDate, startDate, endDate))
            .orderBy(desc(transactions.transactionDate));
    }

    // Get transactions by type
    async getByType(
        type: "income" | "expense" | "transfer",
        limit?: number,
    ): Promise<Transaction[]> {
        let query = this.db
            .select()
            .from(transactions)
            .where(eq(transactions.type, type))
            .orderBy(desc(transactions.transactionDate));

        if (limit) {
            query = query.limit(limit) as any;
        }

        return await query;
    }

    // Get transactions with details (joined with wallet and category)
    async getWithDetails(limit?: number) {
        let query = this.db
            .select({
                transaction: transactions,
                wallet: wallets,
                category: categories,
            })
            .from(transactions)
            .leftJoin(wallets, eq(transactions.walletId, wallets.id))
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .orderBy(desc(transactions.transactionDate));

        if (limit) {
            query = query.limit(limit) as any;
        }

        return await query;
    }

    // Update transaction
    async update(
        id: string,
        data: Partial<Omit<Transaction, "id" | "createdAt">>,
    ): Promise<Transaction> {
        // Get old transaction to reverse balance changes
        const oldTransaction = await this.getById(id);
        if (oldTransaction) {
            await this.reverseWalletBalance(oldTransaction);
        }

        const [updated] = await this.db
            .update(transactions)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(transactions.id, id))
            .returning();

        // Apply new balance changes
        await this.updateWalletBalance(updated);

        return updated;
    }

    // Reverse wallet balance for a transaction (used during update/delete)
    private async reverseWalletBalance(
        transaction: Transaction,
    ): Promise<void> {
        if (transaction.type === "income") {
            await this.db
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} - ${transaction.amount}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, transaction.walletId));
        } else if (transaction.type === "expense") {
            await this.db
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} + ${transaction.amount}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, transaction.walletId));
        } else if (transaction.type === "transfer" && transaction.toWalletId) {
            await this.db
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} + ${transaction.amount} + ${transaction.transferFee || 0}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, transaction.walletId));

            await this.db
                .update(wallets)
                .set({
                    balance: sql`${wallets.balance} - ${transaction.amount}`,
                    updatedAt: new Date(),
                })
                .where(eq(wallets.id, transaction.toWalletId));
        }
    }

    // Delete transaction
    async delete(id: string): Promise<void> {
        const transaction = await this.getById(id);
        if (transaction) {
            await this.reverseWalletBalance(transaction);
        }

        await this.db.delete(transactions).where(eq(transactions.id, id));
    }

    // Get summary statistics
    async getSummary(startDate?: Date, endDate?: Date) {
        let whereClause = sql`1=1`;

        if (startDate && endDate) {
            whereClause = between(
                transactions.transactionDate,
                startDate,
                endDate,
            );
        } else if (startDate) {
            whereClause = gte(transactions.transactionDate, startDate);
        } else if (endDate) {
            whereClause = lte(transactions.transactionDate, endDate);
        }

        const result = await this.db
            .select({
                totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
                totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
                transactionCount: sql<number>`COUNT(*)`,
            })
            .from(transactions)
            .where(whereClause);

        const { totalIncome, totalExpense, transactionCount } = result[0];

        return {
            totalIncome,
            totalExpense,
            netAmount: totalIncome - totalExpense,
            transactionCount,
        };
    }

    // Get spending by category
    async getSpendingByCategory(startDate?: Date, endDate?: Date) {
        let whereClause = eq(transactions.type, "expense");

        if (startDate && endDate) {
            whereClause = and(
                eq(transactions.type, "expense"),
                between(transactions.transactionDate, startDate, endDate),
            ) as any;
        }

        return await this.db
            .select({
                categoryId: transactions.categoryId,
                categoryName: categories.name,
                categoryIcon: categories.icon,
                categoryColor: categories.color,
                totalAmount: sql<number>`SUM(${transactions.amount})`,
                transactionCount: sql<number>`COUNT(*)`,
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(whereClause)
            .groupBy(
                transactions.categoryId,
                categories.name,
                categories.icon,
                categories.color,
            );
    }

    // Get income by category
    async getIncomeByCategory(startDate?: Date, endDate?: Date) {
        let whereClause = eq(transactions.type, "income");

        if (startDate && endDate) {
            whereClause = and(
                eq(transactions.type, "income"),
                between(transactions.transactionDate, startDate, endDate),
            ) as any;
        }

        return await this.db
            .select({
                categoryId: transactions.categoryId,
                categoryName: categories.name,
                categoryIcon: categories.icon,
                categoryColor: categories.color,
                totalAmount: sql<number>`SUM(${transactions.amount})`,
                transactionCount: sql<number>`COUNT(*)`,
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(whereClause)
            .groupBy(
                transactions.categoryId,
                categories.name,
                categories.icon,
                categories.color,
            );
    }

    // Search transactions
    async search(searchTerm: string, limit = 50): Promise<Transaction[]> {
        return await this.db
            .select()
            .from(transactions)
            .where(
                sql`${transactions.description} LIKE ${"%" + searchTerm + "%"} OR ${transactions.notes} LIKE ${"%" + searchTerm + "%"}`,
            )
            .orderBy(desc(transactions.transactionDate))
            .limit(limit);
    }
}
