import {
    billReminderService,
    budgetService,
    categoryService,
    // generateDueRecurringTransactions,
    getDashboardSummary,
    initializeDatabase,
    lendBorrowService,
    // recurringTransactionService,
    settingsService,
    transactionService,
    walletService,
} from "./db";

// ============================================
// INITIALIZATION
// ============================================

export async function initApp() {
    // Initialize database and seed default data
    await initializeDatabase();

    // Generate any due recurring transactions
    // await generateDueRecurringTransactions();
}

// ============================================
// WALLET EXAMPLES
// ============================================

export async function walletExamples() {
    // Create a bank account
    const bankAccount = await walletService.create({
        name: "HDFC Savings",
        type: "bank",
        balance: 50000,
        currency: "INR",
        icon: "🏦",
        color: "#1E88E5",
        notes: "Primary savings account",
        isActive: true,
    });

    // Create a credit card
    const creditCard = await walletService.create({
        name: "HDFC Regalia",
        type: "credit_card",
        balance: 0,
        currency: "INR",
        creditLimit: 100000,
        billingDate: 15, // 15th of every month
        dueDate: 25, // 25th of every month
        cashbackRate: 1.5, // 1.5% cashback
        icon: "💳",
        color: "#E53935",
        notes: "Premium credit card",
        isActive: true,
    });

    // Get all wallets
    const wallets = await walletService.getAll();
    console.log("All wallets:", wallets);

    // Get credit card info with usage
    const creditCardInfo = await walletService.getCreditCardInfo(creditCard.id);
    console.log("Credit card info:", creditCardInfo);

    // Get total balance
    const totalBalance = await walletService.getTotalBalance();
    console.log("Total balance:", totalBalance);
}

// ============================================
// TRANSACTION EXAMPLES
// ============================================

export async function transactionExamples() {
    const wallets = await walletService.getAll();
    const categories = await categoryService.getAll();
    const wallet = wallets[0];
    const category = categories.find((c) => c.name === "Food & Dining");

    // Create an expense
    const expense = await transactionService.create({
        walletId: wallet.id,
        type: "expense",
        amount: 500,
        categoryId: category?.id,
        description: "Dinner at restaurant",
        notes: "With friends",
        transactionDate: new Date(),
        tags: JSON.stringify(["restaurant", "dinner"]),
        toWalletId: null,
        transferFee: 0,
        recurringId: null,
        attachments: null,
    });

    // Create income
    const income = await transactionService.create({
        walletId: wallet.id,
        type: "income",
        amount: 50000,
        categoryId: categories.find((c) => c.name === "Salary")?.id,
        description: "Monthly salary",
        transactionDate: new Date(),
        toWalletId: null,
        transferFee: 0,
        recurringId: null,
        tags: null,
        attachments: null,
        notes: null,
    });

    // Transfer between wallets
    if (wallets.length >= 2) {
        const transfer = await transactionService.create({
            walletId: wallets[0].id,
            type: "transfer",
            amount: 10000,
            toWalletId: wallets[1].id,
            transferFee: 0,
            description: "Transfer to savings",
            transactionDate: new Date(),
            categoryId: null,
            recurringId: null,
            notes: null,
            tags: null,
            attachments: null,
        });
    }

    // Get recent transactions
    const recent = await transactionService.getAll(10);
    console.log("Recent transactions:", recent);

    // Get spending summary for this month
    const startDate = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
    );
    const endDate = new Date();
    const summary = await transactionService.getSummary(startDate, endDate);
    console.log("This month summary:", summary);

    // Get spending by category
    const spendingByCategory = await transactionService.getSpendingByCategory(
        startDate,
        endDate,
    );
    console.log("Spending by category:", spendingByCategory);
}

// ============================================
// RECURRING TRANSACTION EXAMPLES
// ============================================

// export async function recurringTransactionExamples() {
//     const wallets = await walletService.getAll();
//     const categories = await categoryService.getAll();

//     // Create monthly rent payment
//     const rent = await recurringTransactionService.create({
//         walletId: wallets[0].id,
//         type: "expense",
//         amount: 15000,
//         categoryId: categories.find((c) => c.name === "Bills & Utilities")?.id,
//         description: "Monthly rent",
//         notes: "Apartment rent",
//         frequency: "monthly",
//         interval: 1,
//         startDate: new Date(),
//         endDate: null, // Indefinite
//         dayOfMonth: 1, // 1st of every month
//         daysOfWeek: null,
//         lastGeneratedDate: null,
//         isActive: true,
//     });

//     // Create bi-weekly salary
//     const salary = await recurringTransactionService.create({
//         walletId: wallets[0].id,
//         type: "income",
//         amount: 25000,
//         categoryId: categories.find((c) => c.name === "Salary")?.id,
//         description: "Bi-weekly salary",
//         frequency: "weekly",
//         interval: 2,
//         startDate: new Date(),
//         endDate: null,
//         dayOfMonth: null,
//         daysOfWeek: JSON.stringify([5]), // Friday
//         lastGeneratedDate: null,
//         isActive: true,
//         notes: null,
//     });

//     // Generate transactions
//     const count =
//         await recurringTransactionService.generateAllDueTransactions();
//     console.log(`Generated ${count} transactions`);

//     // Get upcoming dates for a recurring transaction
//     const upcomingDates = recurringTransactionService.getUpcomingDates(rent, 5);
//     console.log("Upcoming rent dates:", upcomingDates);
// }

// ============================================
// LEND/BORROW EXAMPLES
// ============================================

export async function lendBorrowExamples() {
    const wallets = await walletService.getAll();

    // Record money lent to friend
    const lent = await lendBorrowService.create({
        type: "lent",
        personName: "John Doe",
        amount: 5000,
        remainingAmount: 5000,
        description: "Personal loan",
        notes: "To be repaid in 3 months",
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        walletId: wallets[0].id,
        status: "pending",
    });

    // Record a payment
    await lendBorrowService.addPayment(lent.id, {
        amount: 2000,
        paymentDate: new Date(),
        notes: "First installment",
        transactionId: null,
    });

    // Get summary
    const summary = await lendBorrowService.getSummary();
    console.log("Lend/Borrow summary:", summary);

    // Get overdue records
    const overdue = await lendBorrowService.getOverdueRecords();
    console.log("Overdue records:", overdue);

    // Get record with payment history
    const withPayments = await lendBorrowService.getWithPayments(lent.id);
    console.log("Record with payments:", withPayments);
}

// ============================================
// BUDGET EXAMPLES
// ============================================

export async function budgetExamples() {
    const categories = await categoryService.getAll();
    const foodCategory = categories.find((c) => c.name === "Food & Dining");

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Set budget for food
    if (foodCategory) {
        await budgetService.upsertBudget(foodCategory.id, 10000, month, year);
    }

    // Get budget with spending
    const budgetsWithSpending = await budgetService.getBudgetWithSpending(
        month,
        year,
    );
    console.log("Budgets with spending:", budgetsWithSpending);

    // Get budget summary
    const summary = await budgetService.getBudgetSummary(month, year);
    console.log("Budget summary:", summary);

    // Get budget alerts (categories over 80% budget)
    const alerts = await budgetService.getBudgetAlerts(month, year, 80);
    console.log("Budget alerts:", alerts);

    // Copy budgets to next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    await budgetService.copyBudgets(month, year, nextMonth, nextYear);
}

// ============================================
// BILL REMINDER EXAMPLES
// ============================================

export async function billReminderExamples() {
    const wallets = await walletService.getAll();
    const categories = await categoryService.getAll();

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5); // 5 days from now

    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before

    // Create a one-time bill reminder
    const electricBill = await billReminderService.create({
        title: "Electricity Bill",
        amount: 2500,
        categoryId: categories.find((c) => c.name === "Bills & Utilities")?.id,
        walletId: wallets[0].id,
        dueDate,
        reminderDate,
        isRecurring: false,
        frequency: null,
        isPaid: false,
        transactionId: null,
        notes: "Monthly electricity bill",
    });

    // Create recurring bill reminder
    const internetBill = await billReminderService.create({
        title: "Internet Bill",
        amount: 999,
        categoryId: categories.find((c) => c.name === "Bills & Utilities")?.id,
        walletId: wallets[0].id,
        dueDate,
        reminderDate,
        isRecurring: true,
        frequency: "monthly",
        isPaid: false,
        transactionId: null,
        notes: "Broadband subscription",
    });

    // Get upcoming bills
    const upcoming = await billReminderService.getUpcoming(7);
    console.log("Upcoming bills:", upcoming);

    // Get overdue bills
    const overdue = await billReminderService.getOverdue();
    console.log("Overdue bills:", overdue);

    // Mark as paid
    const transaction = await transactionService.create({
        walletId: wallets[0].id,
        type: "expense",
        amount: electricBill.amount || 0,
        categoryId: electricBill.categoryId,
        description: electricBill.title,
        transactionDate: new Date(),
        toWalletId: null,
        transferFee: 0,
        recurringId: null,
        notes: null,
        tags: null,
        attachments: null,
    });

    await billReminderService.markAsPaid(electricBill.id, transaction.id);

    // Get summary
    const summary = await billReminderService.getSummary();
    console.log("Bill summary:", summary);
}

// ============================================
// DASHBOARD EXAMPLE
// ============================================

export async function getDashboard() {
    const summary = await getDashboardSummary();
    console.log("Dashboard summary:", summary);

    return summary;
}

// ============================================
// SETTINGS EXAMPLES
// ============================================

export async function settingsExamples() {
    // Get currency
    const currency = await settingsService.getCurrency();
    console.log("Currency:", currency);

    // Set theme
    await settingsService.setTheme("dark");

    // Get all settings
    const allSettings = await settingsService.getAllAsObject();
    console.log("All settings:", allSettings);

    // Set custom setting
    await settingsService.set("customKey", "customValue");

    // Get typed setting
    const customValue = await settingsService.getTyped(
        "customKey",
        "defaultValue",
    );
    console.log("Custom value:", customValue);
}
