import type { Budget, NewBudget } from "@/db/schema";
import { budgets, categories, transactions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

export class BudgetService {
    constructor(private db: ReturnType<typeof drizzle>) {}

    // Create a new budget
    async create(
        budget: Omit<NewBudget, "id" | "createdAt" | "updatedAt">,
    ): Promise<Budget> {
        const id = crypto.randomUUID();
        const now = new Date();

        const [newBudget] = await this.db
            .insert(budgets)
            .values({
                ...budget,
                id,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        return newBudget;
    }

    // Get all budgets
    async getAll(): Promise<Budget[]> {
        return await this.db.select().from(budgets);
    }

    // Get budget by ID
    async getById(id: string): Promise<Budget | undefined> {
        const [budget] = await this.db
            .select()
            .from(budgets)
            .where(eq(budgets.id, id))
            .limit(1);

        return budget;
    }

    // Get budgets for a specific month/year
    async getByPeriod(month: number, year: number): Promise<Budget[]> {
        return await this.db
            .select()
            .from(budgets)
            .where(and(eq(budgets.month, month), eq(budgets.year, year)));
    }

    // Get budget for a category in a specific period
    async getByCategoryAndPeriod(
        categoryId: string,
        month: number,
        year: number,
    ): Promise<Budget | undefined> {
        const [budget] = await this.db
            .select()
            .from(budgets)
            .where(
                and(
                    eq(budgets.categoryId, categoryId),
                    eq(budgets.month, month),
                    eq(budgets.year, year),
                ),
            )
            .limit(1);

        return budget;
    }

    // Update budget
    async update(
        id: string,
        data: Partial<Omit<Budget, "id" | "createdAt">>,
    ): Promise<Budget> {
        const [updated] = await this.db
            .update(budgets)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(budgets.id, id))
            .returning();

        return updated;
    }

    // Delete budget
    async delete(id: string): Promise<void> {
        await this.db.delete(budgets).where(eq(budgets.id, id));
    }

    // Get budget with spending for a specific period
    async getBudgetWithSpending(month: number, year: number) {
        // Get all budgets for the period
        const periodBudgets = await this.getByPeriod(month, year);

        // Calculate start and end dates for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Get spending for each category
        const budgetsWithSpending = await Promise.all(
            periodBudgets.map(async (budget) => {
                const spendingResult = await this.db
                    .select({
                        spent: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
                        transactionCount: sql<number>`COUNT(*)`,
                    })
                    .from(transactions)
                    .where(
                        and(
                            eq(transactions.categoryId, budget.categoryId),
                            eq(transactions.type, "expense"),
                            sql`${transactions.transactionDate} >= ${startDate}`,
                            sql`${transactions.transactionDate} <= ${endDate}`,
                        ),
                    );

                const { spent, transactionCount } = spendingResult[0];
                const remaining = budget.amount - spent;
                const percentage = (spent / budget.amount) * 100;

                // Get category details
                const [category] = await this.db
                    .select()
                    .from(categories)
                    .where(eq(categories.id, budget.categoryId))
                    .limit(1);

                return {
                    ...budget,
                    category,
                    spent,
                    remaining,
                    percentage,
                    transactionCount,
                    isOverBudget: spent > budget.amount,
                };
            }),
        );

        return budgetsWithSpending;
    }

    // Get overall budget summary for a period
    async getBudgetSummary(month: number, year: number) {
        const budgetsWithSpending = await this.getBudgetWithSpending(
            month,
            year,
        );

        const totalBudget = budgetsWithSpending.reduce(
            (sum, b) => sum + b.amount,
            0,
        );
        const totalSpent = budgetsWithSpending.reduce(
            (sum, b) => sum + b.spent,
            0,
        );
        const totalRemaining = totalBudget - totalSpent;
        const overallPercentage =
            totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        const overBudgetCategories = budgetsWithSpending.filter(
            (b) => b.isOverBudget,
        );

        return {
            totalBudget,
            totalSpent,
            totalRemaining,
            overallPercentage,
            categoryCount: budgetsWithSpending.length,
            overBudgetCount: overBudgetCategories.length,
            budgets: budgetsWithSpending,
            isOverBudget: totalSpent > totalBudget,
        };
    }

    // Create or update budget for a category
    async upsertBudget(
        categoryId: string,
        amount: number,
        month: number,
        year: number,
    ): Promise<Budget> {
        const existing = await this.getByCategoryAndPeriod(
            categoryId,
            month,
            year,
        );

        if (existing) {
            return await this.update(existing.id, { amount });
        }

        return await this.create({
            categoryId,
            amount,
            period: "monthly",
            month,
            year,
        });
    }

    // Copy budgets from one period to another
    async copyBudgets(
        fromMonth: number,
        fromYear: number,
        toMonth: number,
        toYear: number,
    ): Promise<Budget[]> {
        const sourceBudgets = await this.getByPeriod(fromMonth, fromYear);

        const newBudgets: Budget[] = [];
        for (const sourceBudget of sourceBudgets) {
            // Check if budget already exists for target period
            const existing = await this.getByCategoryAndPeriod(
                sourceBudget.categoryId,
                toMonth,
                toYear,
            );

            if (!existing) {
                const newBudget = await this.create({
                    categoryId: sourceBudget.categoryId,
                    amount: sourceBudget.amount,
                    period: sourceBudget.period,
                    month: toMonth,
                    year: toYear,
                });
                newBudgets.push(newBudget);
            }
        }

        return newBudgets;
    }

    // Get budget alerts (categories nearing or over budget)
    async getBudgetAlerts(month: number, year: number, threshold = 80) {
        const budgetsWithSpending = await this.getBudgetWithSpending(
            month,
            year,
        );

        return budgetsWithSpending.filter(
            (b) => b.percentage >= threshold || b.isOverBudget,
        );
    }

    // Get spending trend for a category across multiple months
    async getCategoryTrend(categoryId: string, months = 6) {
        const now = new Date();
        const trends: {
            month: number;
            year: number;
            budget: number;
            spent: number;
        }[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();

            const budget = await this.getByCategoryAndPeriod(
                categoryId,
                month,
                year,
            );

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const spendingResult = await this.db
                .select({
                    spent: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
                })
                .from(transactions)
                .where(
                    and(
                        eq(transactions.categoryId, categoryId),
                        eq(transactions.type, "expense"),
                        sql`${transactions.transactionDate} >= ${startDate}`,
                        sql`${transactions.transactionDate} <= ${endDate}`,
                    ),
                );

            trends.push({
                month,
                year,
                budget: budget?.amount || 0,
                spent: spendingResult[0].spent,
            });
        }

        return trends;
    }
}
