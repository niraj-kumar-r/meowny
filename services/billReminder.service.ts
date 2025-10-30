import type { BillReminder, NewBillReminder } from "@/db/schema";
import { billReminders } from "@/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

export class BillReminderService {
    constructor(private db: ReturnType<typeof drizzle>) {}

    // Create a new bill reminder
    async create(
        reminder: Omit<NewBillReminder, "id" | "createdAt" | "updatedAt">,
    ): Promise<BillReminder> {
        const id = crypto.randomUUID();
        const now = new Date();

        const [newReminder] = await this.db
            .insert(billReminders)
            .values({
                ...reminder,
                id,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        return newReminder;
    }

    // Get all bill reminders
    async getAll(): Promise<BillReminder[]> {
        return await this.db
            .select()
            .from(billReminders)
            .orderBy(billReminders.dueDate);
    }

    // Get reminder by ID
    async getById(id: string): Promise<BillReminder | undefined> {
        const [reminder] = await this.db
            .select()
            .from(billReminders)
            .where(eq(billReminders.id, id))
            .limit(1);

        return reminder;
    }

    // Get unpaid reminders
    async getUnpaid(): Promise<BillReminder[]> {
        return await this.db
            .select()
            .from(billReminders)
            .where(eq(billReminders.isPaid, false))
            .orderBy(billReminders.dueDate);
    }

    // Get paid reminders
    async getPaid(): Promise<BillReminder[]> {
        return await this.db
            .select()
            .from(billReminders)
            .where(eq(billReminders.isPaid, true))
            .orderBy(desc(billReminders.dueDate));
    }

    // Get upcoming reminders (within next N days)
    async getUpcoming(days = 7): Promise<BillReminder[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return await this.db
            .select()
            .from(billReminders)
            .where(
                and(
                    eq(billReminders.isPaid, false),
                    gte(billReminders.dueDate, now),
                    lte(billReminders.dueDate, futureDate),
                ),
            )
            .orderBy(billReminders.dueDate);
    }

    // Get overdue reminders
    async getOverdue(): Promise<BillReminder[]> {
        const now = new Date();

        return await this.db
            .select()
            .from(billReminders)
            .where(
                and(
                    eq(billReminders.isPaid, false),
                    lte(billReminders.dueDate, now),
                ),
            )
            .orderBy(billReminders.dueDate);
    }

    // Get reminders due today
    async getDueToday(): Promise<BillReminder[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return await this.db
            .select()
            .from(billReminders)
            .where(
                and(
                    eq(billReminders.isPaid, false),
                    gte(billReminders.dueDate, today),
                    lte(billReminders.dueDate, tomorrow),
                ),
            )
            .orderBy(billReminders.dueDate);
    }

    // Get reminders by wallet
    async getByWallet(walletId: string): Promise<BillReminder[]> {
        return await this.db
            .select()
            .from(billReminders)
            .where(eq(billReminders.walletId, walletId))
            .orderBy(billReminders.dueDate);
    }

    // Get reminders by category
    async getByCategory(categoryId: string): Promise<BillReminder[]> {
        return await this.db
            .select()
            .from(billReminders)
            .where(eq(billReminders.categoryId, categoryId))
            .orderBy(billReminders.dueDate);
    }

    // Get recurring reminders
    async getRecurring(): Promise<BillReminder[]> {
        return await this.db
            .select()
            .from(billReminders)
            .where(eq(billReminders.isRecurring, true))
            .orderBy(billReminders.dueDate);
    }

    // Update reminder
    async update(
        id: string,
        data: Partial<Omit<BillReminder, "id" | "createdAt">>,
    ): Promise<BillReminder> {
        const [updated] = await this.db
            .update(billReminders)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(billReminders.id, id))
            .returning();

        return updated;
    }

    // Mark as paid
    async markAsPaid(
        id: string,
        transactionId?: string,
    ): Promise<BillReminder> {
        const reminder = await this.getById(id);
        if (!reminder) {
            throw new Error("Bill reminder not found");
        }

        const updated = await this.update(id, {
            isPaid: true,
            transactionId: transactionId || null,
        });

        // If recurring, create next reminder
        if (reminder.isRecurring && reminder.frequency) {
            await this.createNextRecurring(reminder);
        }

        return updated;
    }

    // Mark as unpaid
    async markAsUnpaid(id: string): Promise<BillReminder> {
        return await this.update(id, {
            isPaid: false,
            transactionId: null,
        });
    }

    // Delete reminder
    async delete(id: string): Promise<void> {
        await this.db.delete(billReminders).where(eq(billReminders.id, id));
    }

    // Create next recurring reminder
    private async createNextRecurring(
        reminder: BillReminder,
    ): Promise<BillReminder | null> {
        if (!reminder.isRecurring || !reminder.frequency) {
            return null;
        }

        const nextDueDate = new Date(reminder.dueDate);

        switch (reminder.frequency) {
            case "monthly":
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                break;
            case "yearly":
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                break;
            default:
                return null;
        }

        // Calculate reminder date (e.g., 3 days before due date)
        const nextReminderDate = reminder.reminderDate
            ? new Date(
                  nextDueDate.getTime() -
                      (reminder.dueDate.getTime() -
                          reminder.reminderDate.getTime()),
              )
            : null;

        return await this.create({
            title: reminder.title,
            amount: reminder.amount,
            categoryId: reminder.categoryId,
            walletId: reminder.walletId,
            dueDate: nextDueDate,
            reminderDate: nextReminderDate,
            isRecurring: true,
            frequency: reminder.frequency,
            isPaid: false,
            transactionId: null,
            notes: reminder.notes,
        });
    }

    // Get reminders that need notification (reminderDate is today or past)
    async getRemindersToNotify(): Promise<BillReminder[]> {
        const now = new Date();

        return await this.db
            .select()
            .from(billReminders)
            .where(
                and(
                    eq(billReminders.isPaid, false),
                    sql`${billReminders.reminderDate} IS NOT NULL`,
                    lte(billReminders.reminderDate, now),
                ),
            )
            .orderBy(billReminders.reminderDate);
    }

    // Get summary statistics
    async getSummary() {
        const now = new Date();

        const unpaidResult = await this.db
            .select({
                total: sql<number>`COALESCE(SUM(${billReminders.amount}), 0)`,
                count: sql<number>`COUNT(*)`,
            })
            .from(billReminders)
            .where(eq(billReminders.isPaid, false));

        const overdueResult = await this.db
            .select({
                total: sql<number>`COALESCE(SUM(${billReminders.amount}), 0)`,
                count: sql<number>`COUNT(*)`,
            })
            .from(billReminders)
            .where(
                and(
                    eq(billReminders.isPaid, false),
                    lte(billReminders.dueDate, now),
                ),
            );

        const upcomingResult = await this.db
            .select({
                total: sql<number>`COALESCE(SUM(${billReminders.amount}), 0)`,
                count: sql<number>`COUNT(*)`,
            })
            .from(billReminders)
            .where(
                and(
                    eq(billReminders.isPaid, false),
                    gte(billReminders.dueDate, now),
                ),
            );

        return {
            unpaid: {
                total: unpaidResult[0].total,
                count: unpaidResult[0].count,
            },
            overdue: {
                total: overdueResult[0].total,
                count: overdueResult[0].count,
            },
            upcoming: {
                total: upcomingResult[0].total,
                count: upcomingResult[0].count,
            },
        };
    }

    // Get reminders for a specific month
    async getByMonth(month: number, year: number): Promise<BillReminder[]> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        return await this.db
            .select()
            .from(billReminders)
            .where(
                and(
                    gte(billReminders.dueDate, startDate),
                    lte(billReminders.dueDate, endDate),
                ),
            )
            .orderBy(billReminders.dueDate);
    }

    // Snooze a reminder (postpone by N days)
    async snooze(id: string, days: number): Promise<BillReminder> {
        const reminder = await this.getById(id);
        if (!reminder) {
            throw new Error("Bill reminder not found");
        }

        const newDueDate = new Date(reminder.dueDate);
        newDueDate.setDate(newDueDate.getDate() + days);

        const newReminderDate = reminder.reminderDate
            ? new Date(
                  reminder.reminderDate.getTime() + days * 24 * 60 * 60 * 1000,
              )
            : null;

        return await this.update(id, {
            dueDate: newDueDate,
            reminderDate: newReminderDate,
        });
    }
}
