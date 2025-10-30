import type {
    LendBorrow,
    LendBorrowPayment,
    NewLendBorrow,
    NewLendBorrowPayment,
} from "@/db/schema";
import { lendBorrow, lendBorrowPayments } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

export class LendBorrowService {
    constructor(private db: ReturnType<typeof drizzle>) {}

    // Create a new lend/borrow record
    async create(
        record: Omit<NewLendBorrow, "id" | "createdAt" | "updatedAt">,
    ): Promise<LendBorrow> {
        const id = crypto.randomUUID();
        const now = new Date();

        const [newRecord] = await this.db
            .insert(lendBorrow)
            .values({
                ...record,
                id,
                remainingAmount: record.remainingAmount || record.amount,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        return newRecord;
    }

    // Get all lend/borrow records
    async getAll(): Promise<LendBorrow[]> {
        return await this.db
            .select()
            .from(lendBorrow)
            .orderBy(desc(lendBorrow.createdAt));
    }

    // Get record by ID
    async getById(id: string): Promise<LendBorrow | undefined> {
        const [record] = await this.db
            .select()
            .from(lendBorrow)
            .where(eq(lendBorrow.id, id))
            .limit(1);

        return record;
    }

    // Get lent records (money you lent to others)
    async getLentRecords(status?: string): Promise<LendBorrow[]> {
        let whereClause = eq(lendBorrow.type, "lent");

        if (status) {
            whereClause = and(
                whereClause,
                eq(lendBorrow.status, status),
            ) as any;
        }

        return await this.db
            .select()
            .from(lendBorrow)
            .where(whereClause)
            .orderBy(desc(lendBorrow.createdAt));
    }

    // Get borrowed records (money you borrowed from others)
    async getBorrowedRecords(status?: string): Promise<LendBorrow[]> {
        let whereClause = eq(lendBorrow.type, "borrowed");

        if (status) {
            whereClause = and(
                whereClause,
                eq(lendBorrow.status, status),
            ) as any;
        }

        return await this.db
            .select()
            .from(lendBorrow)
            .where(whereClause)
            .orderBy(desc(lendBorrow.createdAt));
    }

    // Get records by person
    async getByPerson(personName: string): Promise<LendBorrow[]> {
        return await this.db
            .select()
            .from(lendBorrow)
            .where(eq(lendBorrow.personName, personName))
            .orderBy(desc(lendBorrow.createdAt));
    }

    // Get pending records
    async getPendingRecords(): Promise<LendBorrow[]> {
        return await this.db
            .select()
            .from(lendBorrow)
            .where(eq(lendBorrow.status, "pending"))
            .orderBy(desc(lendBorrow.createdAt));
    }

    // Get overdue records
    async getOverdueRecords(): Promise<LendBorrow[]> {
        const now = new Date();

        return await this.db
            .select()
            .from(lendBorrow)
            .where(
                and(
                    sql`${lendBorrow.status} != 'completed'`,
                    sql`${lendBorrow.dueDate} IS NOT NULL`,
                    sql`${lendBorrow.dueDate} < ${now}`,
                ),
            )
            .orderBy(lendBorrow.dueDate);
    }

    // Update record
    async update(
        id: string,
        data: Partial<Omit<LendBorrow, "id" | "createdAt">>,
    ): Promise<LendBorrow> {
        const [updated] = await this.db
            .update(lendBorrow)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(lendBorrow.id, id))
            .returning();

        return updated;
    }

    // Delete record
    async delete(id: string): Promise<void> {
        await this.db.delete(lendBorrow).where(eq(lendBorrow.id, id));
    }

    // Add a payment
    async addPayment(
        lendBorrowId: string,
        payment: Omit<
            NewLendBorrowPayment,
            "id" | "lendBorrowId" | "createdAt"
        >,
    ): Promise<LendBorrowPayment> {
        const record = await this.getById(lendBorrowId);
        if (!record) {
            throw new Error("Lend/Borrow record not found");
        }

        const paymentId = crypto.randomUUID();
        const [newPayment] = await this.db
            .insert(lendBorrowPayments)
            .values({
                ...payment,
                id: paymentId,
                lendBorrowId,
                createdAt: new Date(),
            })
            .returning();

        // Update remaining amount and status
        const newRemaining = record.remainingAmount - payment.amount;
        let newStatus = record.status;

        if (newRemaining <= 0) {
            newStatus = "completed";
        } else if (newRemaining < record.amount) {
            newStatus = "partial";
        }

        await this.update(lendBorrowId, {
            remainingAmount: Math.max(0, newRemaining),
            status: newStatus,
        });

        return newPayment;
    }

    // Get payments for a record
    async getPayments(lendBorrowId: string): Promise<LendBorrowPayment[]> {
        return await this.db
            .select()
            .from(lendBorrowPayments)
            .where(eq(lendBorrowPayments.lendBorrowId, lendBorrowId))
            .orderBy(desc(lendBorrowPayments.paymentDate));
    }

    // Delete a payment
    async deletePayment(paymentId: string): Promise<void> {
        const [payment] = await this.db
            .select()
            .from(lendBorrowPayments)
            .where(eq(lendBorrowPayments.id, paymentId))
            .limit(1);

        if (!payment) {
            throw new Error("Payment not found");
        }

        // Delete the payment
        await this.db
            .delete(lendBorrowPayments)
            .where(eq(lendBorrowPayments.id, paymentId));

        // Recalculate remaining amount and status
        const record = await this.getById(payment.lendBorrowId);
        if (record) {
            const payments = await this.getPayments(payment.lendBorrowId);
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const newRemaining = record.amount - totalPaid;

            let newStatus: string = "pending";
            if (newRemaining <= 0) {
                newStatus = "completed";
            } else if (newRemaining < record.amount) {
                newStatus = "partial";
            }

            await this.update(payment.lendBorrowId, {
                remainingAmount: Math.max(0, newRemaining),
                status: newStatus,
            });
        }
    }

    // Get summary statistics
    async getSummary() {
        const lentResult = await this.db
            .select({
                total: sql<number>`COALESCE(SUM(${lendBorrow.amount}), 0)`,
                remaining: sql<number>`COALESCE(SUM(${lendBorrow.remainingAmount}), 0)`,
                count: sql<number>`COUNT(*)`,
            })
            .from(lendBorrow)
            .where(eq(lendBorrow.type, "lent"));

        const borrowedResult = await this.db
            .select({
                total: sql<number>`COALESCE(SUM(${lendBorrow.amount}), 0)`,
                remaining: sql<number>`COALESCE(SUM(${lendBorrow.remainingAmount}), 0)`,
                count: sql<number>`COUNT(*)`,
            })
            .from(lendBorrow)
            .where(eq(lendBorrow.type, "borrowed"));

        return {
            lent: {
                total: lentResult[0].total,
                remaining: lentResult[0].remaining,
                received: lentResult[0].total - lentResult[0].remaining,
                count: lentResult[0].count,
            },
            borrowed: {
                total: borrowedResult[0].total,
                remaining: borrowedResult[0].remaining,
                paid: borrowedResult[0].total - borrowedResult[0].remaining,
                count: borrowedResult[0].count,
            },
            netAmount: lentResult[0].remaining - borrowedResult[0].remaining,
        };
    }

    // Get records with payment history
    async getWithPayments(id: string) {
        const record = await this.getById(id);
        if (!record) {
            return null;
        }

        const payments = await this.getPayments(id);

        return {
            ...record,
            payments,
            totalPaid: record.amount - record.remainingAmount,
            paymentPercentage:
                ((record.amount - record.remainingAmount) / record.amount) *
                100,
        };
    }
}
