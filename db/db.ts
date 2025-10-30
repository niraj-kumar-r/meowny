import * as schema from "@/db/schema";
import {
    BillReminderService,
    BudgetService,
    CategoryService,
    LendBorrowService,
    // RecurringTransactionService,
    SettingsService,
    TransactionService,
    WalletService,
} from "@/services";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as SQLite from "expo-sqlite";

// Database name
const DATABASE_NAME = "meowny.db";

const expoDB = SQLite.openDatabaseSync(DATABASE_NAME);

export const db = drizzle(expoDB, { schema });

// Initialize all services
export const walletService = new WalletService(db);
export const categoryService = new CategoryService(db);
export const transactionService = new TransactionService(db);
// export const recurringTransactionService = new RecurringTransactionService(db);
export const lendBorrowService = new LendBorrowService(db);
export const budgetService = new BudgetService(db);
export const billReminderService = new BillReminderService(db);
export const settingsService = new SettingsService(db);

// Hook for running migrations
export function useDbMigrations() {
    const { success, error } = useMigrations(
        db,
        require("./migrations/migrations"),
    );

    return { success, error };
}

// Initialize the app database (run on first launch)
export async function initializeDatabase() {
    try {
        // Initialize default settings
        await settingsService.initializeDefaults();

        // Check if categories are already seeded
        const categories = await categoryService.getAll();
        if (categories.length === 0) {
            await categoryService.seedDefaultCategories();
        }

        console.log("Database initialized successfully");
        return true;
    } catch (error) {
        console.error("Database initialization error:", error);
        return false;
    }
}

// Generate recurring transactions (should be called periodically, e.g., on app launch)
// export async function generateDueRecurringTransactions() {
//     try {
//         const count =
//             await recurringTransactionService.generateAllDueTransactions();
//         if (count > 0) {
//             console.log(`Generated ${count} recurring transactions`);
//         }
//         return count;
//     } catch (error) {
//         console.error("Error generating recurring transactions:", error);
//         return 0;
//     }
// }

// Export all data for backup
export async function exportAllData() {
    try {
        const [
            wallets,
            categories,
            transactions,
            // recurringTransactions,
            lendBorrowRecords,
            budgets,
            billReminders,
            settings,
        ] = await Promise.all([
            walletService.getAll(true),
            categoryService.getAll(),
            transactionService.getAll(),
            // recurringTransactionService.getAll(true),
            lendBorrowService.getAll(),
            budgetService.getAll(),
            billReminderService.getAll(),
            settingsService.getAll(),
        ]);

        const backup = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            data: {
                wallets,
                categories,
                transactions,
                // recurringTransactions,
                lendBorrow: lendBorrowRecords,
                budgets,
                billReminders,
                settings,
            },
        };

        return JSON.stringify(backup, null, 2);
    } catch (error) {
        console.error("Error exporting data:", error);
        throw error;
    }
}

// Import data from backup
export async function importAllData(backupJson: string) {
    try {
        const backup = JSON.parse(backupJson);
        const { data } = backup;

        // Note: This is a simplified import. You may want to add validation
        // and handle conflicts (e.g., duplicate IDs)

        console.log("Importing backup data...");
        console.log("Backup version:", backup.version);
        console.log("Backup timestamp:", backup.timestamp);

        // Import in order (respecting foreign key constraints)
        // 1. Wallets
        // 2. Categories
        // 3. Transactions
        // 4. Recurring Transactions
        // 5. Lend/Borrow
        // 6. Budgets
        // 7. Bill Reminders
        // 8. Settings

        // This is a placeholder - you'll need to implement actual import logic
        // based on your requirements (merge vs replace, conflict resolution, etc.)

        console.log("Data import completed");
        return true;
    } catch (error) {
        console.error("Error importing data:", error);
        throw error;
    }
}

// Get dashboard summary
export async function getDashboardSummary() {
    try {
        const [
            totalBalance,
            totalDebt,
            lendBorrowSummary,
            thisMonthSummary,
            upcomingBills,
            overdueBills,
            billSummary,
        ] = await Promise.all([
            walletService.getTotalBalance(),
            walletService.getTotalCreditCardDebt(),
            lendBorrowService.getSummary(),
            transactionService.getSummary(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                new Date(),
            ),
            billReminderService.getUpcoming(7),
            billReminderService.getOverdue(),
            billReminderService.getSummary(),
        ]);

        return {
            netWorth: totalBalance - totalDebt,
            totalBalance,
            totalDebt,
            lendBorrow: lendBorrowSummary,
            thisMonth: thisMonthSummary,
            bills: {
                upcoming: upcomingBills,
                overdue: overdueBills,
                summary: billSummary,
            },
        };
    } catch (error) {
        console.error("Error getting dashboard summary:", error);
        throw error;
    }
}
