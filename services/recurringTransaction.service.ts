// import type {
//     NewRecurringTransaction,
//     NewTransaction,
//     RecurringTransaction,
// } from "@/db/schema";
// import { recurringTransactions, transactions } from "@/db/schema";
// import { and, eq, isNull, lte, or } from "drizzle-orm";
// import { drizzle } from "drizzle-orm/expo-sqlite";

// export class RecurringTransactionService {
//     constructor(private db: ReturnType<typeof drizzle>) {}

//     // Create a new recurring transaction
//     async create(
//         recurring: Omit<
//             NewRecurringTransaction,
//             "id" | "createdAt" | "updatedAt"
//         >,
//     ): Promise<RecurringTransaction> {
//         const id = crypto.randomUUID();
//         const now = new Date();

//         const [newRecurring] = await this.db
//             .insert(recurringTransactions)
//             .values({
//                 ...recurring,
//                 id,
//                 createdAt: now,
//                 updatedAt: now,
//             })
//             .returning();

//         return newRecurring;
//     }

//     // Get all recurring transactions
//     async getAll(includeInactive = false): Promise<RecurringTransaction[]> {
//         if (includeInactive) {
//             return await this.db.select().from(recurringTransactions);
//         }

//         return await this.db
//             .select()
//             .from(recurringTransactions)
//             .where(eq(recurringTransactions.isActive, true));
//     }

//     // Get recurring transaction by ID
//     async getById(id: string): Promise<RecurringTransaction | undefined> {
//         const [recurring] = await this.db
//             .select()
//             .from(recurringTransactions)
//             .where(eq(recurringTransactions.id, id))
//             .limit(1);

//         return recurring;
//     }

//     // Get recurring transactions by wallet
//     async getByWallet(walletId: string): Promise<RecurringTransaction[]> {
//         return await this.db
//             .select()
//             .from(recurringTransactions)
//             .where(
//                 and(
//                     eq(recurringTransactions.walletId, walletId),
//                     eq(recurringTransactions.isActive, true),
//                 ),
//             );
//     }

//     // Get due recurring transactions (ones that need to be generated)
//     async getDueTransactions(
//         upToDate: Date = new Date(),
//     ): Promise<RecurringTransaction[]> {
//         return await this.db
//             .select()
//             .from(recurringTransactions)
//             .where(
//                 and(
//                     eq(recurringTransactions.isActive, true),
//                     lte(recurringTransactions.startDate, upToDate),
//                     or(
//                         isNull(recurringTransactions.endDate),
//                         lte(upToDate, recurringTransactions.endDate),
//                     ),
//                     or(
//                         isNull(recurringTransactions.lastGeneratedDate),
//                         lte(recurringTransactions.lastGeneratedDate, upToDate),
//                     ),
//                 ),
//             );
//     }

//     // Update recurring transaction
//     async update(
//         id: string,
//         data: Partial<Omit<RecurringTransaction, "id" | "createdAt">>,
//     ): Promise<RecurringTransaction> {
//         const [updated] = await this.db
//             .update(recurringTransactions)
//             .set({
//                 ...data,
//                 updatedAt: new Date(),
//             })
//             .where(eq(recurringTransactions.id, id))
//             .returning();

//         return updated;
//     }

//     // Toggle active status
//     async toggleActive(id: string): Promise<RecurringTransaction> {
//         const recurring = await this.getById(id);
//         if (!recurring) {
//             throw new Error("Recurring transaction not found");
//         }

//         return await this.update(id, { isActive: !recurring.isActive });
//     }

//     // Delete recurring transaction
//     async delete(id: string): Promise<void> {
//         await this.db
//             .delete(recurringTransactions)
//             .where(eq(recurringTransactions.id, id));
//     }

//     // Calculate next occurrence date
//     private getNextOccurrence(
//         recurring: RecurringTransaction,
//         fromDate: Date,
//     ): Date | null {
//         const next = new Date(fromDate);

//         switch (recurring.frequency) {
//             case "daily":
//                 next.setDate(next.getDate() + recurring.interval);
//                 break;

//             case "weekly":
//                 next.setDate(next.getDate() + recurring.interval * 7);
//                 break;

//             case "monthly":
//                 if (recurring.dayOfMonth) {
//                     next.setMonth(next.getMonth() + recurring.interval);
//                     next.setDate(recurring.dayOfMonth);
//                     // Handle invalid dates (e.g., Feb 30 -> Feb 28/29)
//                     if (next.getDate() !== recurring.dayOfMonth) {
//                         next.setDate(0); // Last day of previous month
//                     }
//                 } else {
//                     next.setMonth(next.getMonth() + recurring.interval);
//                 }
//                 break;

//             case "yearly":
//                 next.setFullYear(next.getFullYear() + recurring.interval);
//                 break;

//             default:
//                 return null;
//         }

//         // Check if next occurrence is past end date
//         if (recurring.endDate && next > new Date(recurring.endDate)) {
//             return null;
//         }

//         return next;
//     }

//     // Generate transactions for a recurring transaction
//     async generateTransactions(
//         recurringId: string,
//         upToDate: Date = new Date(),
//     ): Promise<number> {
//         const recurring = await this.getById(recurringId);
//         if (!recurring || !recurring.isActive) {
//             return 0;
//         }

//         let generatedCount = 0;
//         let currentDate = recurring.lastGeneratedDate
//             ? new Date(recurring.lastGeneratedDate)
//             : new Date(recurring.startDate);

//         // Generate transactions up to the current date
//         while (true) {
//             const nextDate = this.getNextOccurrence(recurring, currentDate);

//             if (!nextDate || nextDate > upToDate) {
//                 break;
//             }

//             // Create the transaction
//             const transactionData: Omit<
//                 NewTransaction,
//                 "id" | "createdAt" | "updatedAt"
//             > = {
//                 walletId: recurring.walletId,
//                 type: recurring.type,
//                 amount: recurring.amount,
//                 categoryId: recurring.categoryId,
//                 description: recurring.description,
//                 notes: recurring.notes,
//                 recurringId: recurring.id,
//                 transactionDate: nextDate,
//                 toWalletId: null,
//                 transferFee: 0,
//                 tags: null,
//                 attachments: null,
//             };

//             const txId = crypto.randomUUID();
//             await this.db.insert(transactions).values({
//                 ...transactionData,
//                 id: txId,
//                 createdAt: new Date(),
//                 updatedAt: new Date(),
//             });

//             // Update wallet balance
//             if (recurring.type === "income") {
//                 await this.db.execute(
//                     sql`UPDATE wallets SET balance = balance + ${recurring.amount}, updated_at = ${new Date()} WHERE id = ${recurring.walletId}`,
//                 );
//             } else if (recurring.type === "expense") {
//                 await this.db.execute(
//                     sql`UPDATE wallets SET balance = balance - ${recurring.amount}, updated_at = ${new Date()} WHERE id = ${recurring.walletId}`,
//                 );
//             }

//             generatedCount++;
//             currentDate = nextDate;
//         }

//         // Update last generated date
//         if (generatedCount > 0) {
//             await this.update(recurringId, { lastGeneratedDate: currentDate });
//         }

//         return generatedCount;
//     }

//     // Generate all due transactions
//     async generateAllDueTransactions(
//         upToDate: Date = new Date(),
//     ): Promise<number> {
//         const dueRecurring = await this.getDueTransactions(upToDate);
//         let totalGenerated = 0;

//         for (const recurring of dueRecurring) {
//             const count = await this.generateTransactions(
//                 recurring.id,
//                 upToDate,
//             );
//             totalGenerated += count;
//         }

//         return totalGenerated;
//     }

//     // Get upcoming transactions for a recurring transaction
//     getUpcomingDates(recurring: RecurringTransaction, count = 5): Date[] {
//         const dates: Date[] = [];
//         let currentDate = recurring.lastGeneratedDate
//             ? new Date(recurring.lastGeneratedDate)
//             : new Date(recurring.startDate);

//         for (let i = 0; i < count; i++) {
//             const nextDate = this.getNextOccurrence(recurring, currentDate);
//             if (!nextDate) break;
//             dates.push(nextDate);
//             currentDate = nextDate;
//         }

//         return dates;
//     }

//     // Get transactions generated by a recurring transaction
//     async getGeneratedTransactions(recurringId: string) {
//         return await this.db
//             .select()
//             .from(transactions)
//             .where(eq(transactions.recurringId, recurringId))
//             .orderBy(transactions.transactionDate);
//     }
// }
