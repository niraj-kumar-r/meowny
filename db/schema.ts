import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Wallet types: 'bank', 'cash', 'digital_wallet', 'credit_card'
export const wallets = sqliteTable("wallets", {
    id: text("id").primaryKey(),
    name: text("name").notNull(), // e.g., "HDFC Savings", "Paytm"
    type: text("type").notNull(), // 'bank', 'cash', 'digital_wallet', 'credit_card'
    balance: real("balance").notNull().default(0),
    currency: text("currency").notNull().default("INR"),

    // Credit card specific fields
    creditLimit: real("credit_limit"), // null for non-credit cards
    billingDate: integer("billing_date"), // Day of month (1-31)
    dueDate: integer("due_date"), // Day of month (1-31)
    cashbackRate: real("cashback_rate"), // Percentage (e.g., 1.5 for 1.5%)

    // Metadata
    icon: text("icon"), // Icon name or emoji
    color: text("color"), // Hex color for UI
    notes: text("notes"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Transaction categories
export const categories = sqliteTable("categories", {
    id: text("id").primaryKey(),
    name: text("name").notNull(), // e.g., "Food", "Transport", "Salary"
    type: text("type").notNull(), // 'expense' or 'income'
    icon: text("icon"),
    color: text("color"),
    parentId: text("parent_id"), // For subcategories

    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Main transactions table
export const transactions = sqliteTable("transactions", {
    id: text("id").primaryKey(),
    walletId: text("wallet_id")
        .notNull()
        .references(() => wallets.id, { onDelete: "cascade" }),

    type: text("type").notNull(), // 'income', 'expense', 'transfer'
    amount: real("amount").notNull(),

    categoryId: text("category_id").references(() => categories.id),

    description: text("description"),
    notes: text("notes"),

    // For transfers between wallets
    toWalletId: text("to_wallet_id").references(() => wallets.id),
    transferFee: real("transfer_fee").default(0),

    // For recurring transactions
    recurringId: text("recurring_id").references(
        () => recurringTransactions.id,
    ),

    // Date
    transactionDate: integer("transaction_date", {
        mode: "timestamp",
    }).notNull(),

    // Metadata
    tags: text("tags"), // JSON array of tags
    attachments: text("attachments"), // JSON array of file paths

    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Recurring transactions (templates)
export const recurringTransactions = sqliteTable("recurring_transactions", {
    id: text("id").primaryKey(),
    walletId: text("wallet_id")
        .notNull()
        .references(() => wallets.id, { onDelete: "cascade" }),

    type: text("type").notNull(), // 'income' or 'expense'
    amount: real("amount").notNull(),

    categoryId: text("category_id").references(() => categories.id),

    description: text("description"),
    notes: text("notes"),

    // Recurrence pattern
    frequency: text("frequency").notNull(), // 'daily', 'weekly', 'monthly', 'yearly'
    interval: integer("interval").notNull().default(1), // Every X days/weeks/months
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }), // null = indefinite

    // For monthly: which day of month (1-31)
    dayOfMonth: integer("day_of_month"),
    // For weekly: which days (JSON array [0-6], 0=Sunday)
    daysOfWeek: text("days_of_week"),

    lastGeneratedDate: integer("last_generated_date", { mode: "timestamp" }),

    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Lending/Borrowing records
export const lendBorrow = sqliteTable("lend_borrow", {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // 'lent' or 'borrowed'

    personName: text("person_name").notNull(),
    amount: real("amount").notNull(),
    remainingAmount: real("remaining_amount").notNull(),

    description: text("description"),
    notes: text("notes"),

    dueDate: integer("due_date", { mode: "timestamp" }),

    // Linked wallet (optional - which wallet the money came from/goes to)
    walletId: text("wallet_id").references(() => wallets.id),

    // Status
    status: text("status").notNull().default("pending"), // 'pending', 'partial', 'completed'

    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Payment history for lend/borrow
export const lendBorrowPayments = sqliteTable("lend_borrow_payments", {
    id: text("id").primaryKey(),
    lendBorrowId: text("lend_borrow_id")
        .notNull()
        .references(() => lendBorrow.id, { onDelete: "cascade" }),

    amount: real("amount").notNull(),
    paymentDate: integer("payment_date", { mode: "timestamp" }).notNull(),

    notes: text("notes"),

    // Link to transaction if recorded
    transactionId: text("transaction_id").references(() => transactions.id),

    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Budgets
export const budgets = sqliteTable("budgets", {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
        .notNull()
        .references(() => categories.id, { onDelete: "cascade" }),

    amount: real("amount").notNull(),
    period: text("period").notNull(), // 'monthly', 'yearly'

    // For tracking
    month: integer("month"), // 1-12
    year: integer("year"),

    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Bill reminders
export const billReminders = sqliteTable("bill_reminders", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    amount: real("amount"),

    categoryId: text("category_id").references(() => categories.id),
    walletId: text("wallet_id").references(() => wallets.id),

    dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
    reminderDate: integer("reminder_date", { mode: "timestamp" }),

    isRecurring: integer("is_recurring", { mode: "boolean" })
        .notNull()
        .default(false),
    frequency: text("frequency"), // 'monthly', 'yearly' if recurring

    isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
    transactionId: text("transaction_id").references(() => transactions.id),

    notes: text("notes"),

    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// App settings
export const settings = sqliteTable("settings", {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),

    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// Type exports for TypeScript
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;

export type LendBorrow = typeof lendBorrow.$inferSelect;
export type NewLendBorrow = typeof lendBorrow.$inferInsert;

export type LendBorrowPayment = typeof lendBorrowPayments.$inferSelect;
export type NewLendBorrowPayment = typeof lendBorrowPayments.$inferInsert;

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

export type BillReminder = typeof billReminders.$inferSelect;
export type NewBillReminder = typeof billReminders.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
