# Meowny 🐱

A beautiful, fast, local-first personal finance app built with Expo + React Native + TypeScript.  
Meowny is designed to be lightweight, privacy-friendly (local SQLite), and extensible — with a clean service layer and a Drizzle ORM schema.

## Quick links

- Project root: [package.json](package.json)
- App entry / routing: [app/\_layout.tsx](app/_layout.tsx) and [app/index.tsx](app/index.tsx)
- Database schema: [db/schema.ts](db/schema.ts)
- DB bootstrap & services wiring: [db/db.ts](db/db.ts)
- ORM config: [drizzle.config.ts](drizzle.config.ts)
- Services aggregator: [services/index.ts](services/index.ts)
- Examples & usage: [db/example.ts](db/example.ts)
- UI theming: [constants/theme.ts](constants/theme.ts)
- Icon mapping helper: [`IconSymbol`](components/ui/icon-symbol.tsx)
- Project license: [LICENSE](LICENSE)

## What Meowny is

- A minimal, local-first finance manager supporting wallets, transactions (income/expense/transfer), budgets, lend/borrow tracking, and bill reminders.
- Stores data in an Expo SQLite DB managed via Drizzle ORM (`[db/schema.ts](db/schema.ts)`).
- Exposes concise service classes to operate on the DB (see [`TransactionService`](services/transaction.service.ts), [`WalletService`](services/wallet.service.ts), [`CategoryService`](services/category.service.ts), [`SettingsService`](services/settings.service.ts), [`LendBorrowService`](services/lendBorrow.service.ts), [`BudgetService`](services/budget.service.ts), [`BillReminderService`](services/billReminder.service.ts)).

## Tech stack

- Expo (universal app): the project scaffolding and runtime.
- React Native + TypeScript for UI and app code.
- React Native Paper for Material 3 theming (see [app/\_layout.tsx](app/_layout.tsx)).
- Expo Router for file-based routing (app/).
- Drizzle ORM with expo-sqlite driver for strongly-typed DB access and migrations (`[drizzle.config.ts](drizzle.config.ts)`, `[db/schema.ts](db/schema.ts)`).
- SQLite via `expo-sqlite`.
- Icons: SF Symbols mapping to Material Icons in [`components/ui/icon-symbol.tsx`](components/ui/icon-symbol.tsx).
- Local examples & seeds are available in [db/example.ts](db/example.ts).

## Project structure (high level)

- app/ — Expo Router screens and layout ([app/\_layout.tsx](app/_layout.tsx))
- components/ — UI primitives and helpers (e.g., [`IconSymbol`](components/ui/icon-symbol.tsx), themed text/view)
- db/ — Drizzle schema, DB initialization and examples ([db/schema.ts](db/schema.ts), [db/db.ts](db/db.ts), [db/example.ts](db/example.ts))
- services/ — Business logic that wraps DB access and enforces invariants. See [`services/index.ts`](services/index.ts) which exports:
    - [`TransactionService`](services/transaction.service.ts)
    - [`WalletService`](services/wallet.service.ts)
    - [`CategoryService`](services/category.service.ts)
    - [`SettingsService`](services/settings.service.ts)
    - [`LendBorrowService`](services/lendBorrow.service.ts)
    - [`BudgetService`](services/budget.service.ts)
    - [`BillReminderService`](services/billReminder.service.ts)
- constants/ — theming and app constants ([constants/theme.ts](constants/theme.ts))
- drizzle/ — generated migration/output folder (drizzle config in [drizzle.config.ts](drizzle.config.ts))
- assets/, android/, ios/ — platform assets and native projects

## Highlights / features

- Wallets with support for bank, cash, digital wallets and credit cards (`creditLimit`, billing/due dates) — see [`wallets` table in db/schema.ts](db/schema.ts).
- Transactions supporting income, expense, and transfer flows with proper balance updates and wallet reversal on update/delete — implemented in [`TransactionService`](services/transaction.service.ts).
- Category management and default seeding for common expense/income categories — see [`CategoryService`](services/category.service.ts).
- Budgets with monthly/yearly periods and budget alerts — see [`BudgetService`](services/budget.service.ts).
- Lend/Borrow tracking with payments and status transitions (`pending` → `partial` → `completed`) — see [`LendBorrowService`](services/lendBorrow.service.ts).
- Bill reminders with due-date checks and summary helpers — see [`BillReminderService`](services/billReminder.service.ts).
- App settings persisted to DB with typed helpers and defaults — see [`SettingsService`](services/settings.service.ts).
- Export/import helpers for backup in [db/db.ts](db/db.ts) and settings export in [`SettingsService`](services/settings.service.ts).
- Example seed & usage scripts in [db/example.ts](db/example.ts) to bootstrap your local DB and test flows.

## Getting started (developer)

1. Install dependencies

```bash
npm install
```

2. Start the Expo dev server

```bash
npx expo start
```

3. Run on a simulator/device or web from the Expo DevTools.

## Database & migrations

- Schema and types live in [db/schema.ts](db/schema.ts).
- The app initializes the DB and seeds defaults via [db/db.ts](db/db.ts) — `initializeDatabase()` seeds settings & categories.
- Drizzle config for migration generation: [drizzle.config.ts](drizzle.config.ts).
- Use the Drizzle tooling to generate/run migrations when changing `db/schema.ts`.

## Core development notes

- The services are the single source of truth for business rules (balance updates, cascade behavior). See the service implementations in [services/](services).
- UI theming is driven by Material3 themes merged with [constants/theme.ts](constants/theme.ts) and the Paper provider in [app/\_layout.tsx](app/_layout.tsx).
- Icons use a lightweight mapping approach: SF Symbol names mapped to Material icon names in [`components/ui/icon-symbol.tsx`](components/ui/icon-symbol.tsx).
- Example seed flows live in [db/example.ts](db/example.ts) and demonstrate typical usage of the service layer.
- Backups: [db/db.ts](db/db.ts) provides `exportAllData()` and `importAllData()` helpers — extend these for cloud sync or encrypted backups as needed.

## Examples

- Create a transaction and update wallets via the service layer: see [`TransactionService.create`](services/transaction.service.ts).
- Initialize the app DB and seed defaults: see [`initializeDatabase()` in db/db.ts](db/db.ts).
- Run `transactionExamples()` in [db/example.ts](db/example.ts) for a quick demo script.

## Contributing

- Follow the current coding style (TypeScript + Drizzle + React Native). Keep services pure where possible and add unit tests around critical balance logic.
- Add migrations via Drizzle when modifying [db/schema.ts](db/schema.ts).
- Open a PR with a clear description and include DB migration files when schema changes are introduced.

## License

- This project is released under the GNU Affero General Public License (AGPL) v3. See [LICENSE](LICENSE) for full terms.

## Need help?

- Browse code for examples: [db/example.ts](db/example.ts)
- Inspect services: [services/index.ts](services/index.ts) and individual services (e.g., [`TransactionService`](services/transaction.service.ts), [`SettingsService`](services/settings.service.ts))
- For theming and UI helpers see [constants/theme.ts](constants/theme.ts) and [`components/ui/icon-symbol.tsx`](components/ui/icon-symbol.tsx)

## Author

Niraj Kumar · [GitHub](https://github.com/niraj-kumar-r) · [LinkedIn](https://www.linkedin.com/in/niraj-kumar-r)

Go forth and make something glorious. 🐾
