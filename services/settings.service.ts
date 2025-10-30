import type { Setting } from "@/db/schema";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

export class SettingsService {
    constructor(private db: ReturnType<typeof drizzle>) {}

    // Get a setting by key
    async get(key: string): Promise<string | null> {
        const [setting] = await this.db
            .select()
            .from(settings)
            .where(eq(settings.key, key))
            .limit(1);

        return setting?.value || null;
    }

    // Get a setting with type conversion
    async getTyped<T>(key: string, defaultValue: T): Promise<T> {
        const value = await this.get(key);

        if (value === null) {
            return defaultValue;
        }

        try {
            return JSON.parse(value) as T;
        } catch {
            return value as T;
        }
    }

    // Set a setting
    async set(key: string, value: string): Promise<Setting> {
        const existing = await this.get(key);

        if (existing !== null) {
            const [updated] = await this.db
                .update(settings)
                .set({
                    value,
                    updatedAt: new Date(),
                })
                .where(eq(settings.key, key))
                .returning();

            return updated;
        }

        const id = crypto.randomUUID();
        const [newSetting] = await this.db
            .insert(settings)
            .values({
                id,
                key,
                value,
                updatedAt: new Date(),
            })
            .returning();

        return newSetting;
    }

    // Set a setting with automatic JSON stringification
    async setTyped<T>(key: string, value: T): Promise<Setting> {
        const stringValue =
            typeof value === "string" ? value : JSON.stringify(value);
        return await this.set(key, stringValue);
    }

    // Delete a setting
    async delete(key: string): Promise<void> {
        await this.db.delete(settings).where(eq(settings.key, key));
    }

    // Get all settings
    async getAll(): Promise<Setting[]> {
        return await this.db.select().from(settings);
    }

    // Get all settings as a key-value object
    async getAllAsObject(): Promise<Record<string, string>> {
        const allSettings = await this.getAll();
        return allSettings.reduce(
            (acc, setting) => {
                acc[setting.key] = setting.value;
                return acc;
            },
            {} as Record<string, string>,
        );
    }

    // Initialize default settings
    async initializeDefaults(): Promise<void> {
        const defaults: Record<string, any> = {
            currency: "INR",
            currencySymbol: "₹",
            dateFormat: "DD/MM/YYYY",
            firstDayOfWeek: 1, // Monday
            theme: "system", // 'light', 'dark', 'system'
            notificationsEnabled: true,
            billReminderDays: 3, // Remind 3 days before due date
            backupEnabled: false,
            lastBackupDate: null,
            appVersion: "1.0.0",
            onboardingCompleted: false,
            biometricEnabled: false,
            language: "en",
        };

        for (const [key, value] of Object.entries(defaults)) {
            const existing = await this.get(key);
            if (existing === null) {
                await this.setTyped(key, value);
            }
        }
    }

    // Common setting getters/setters
    async getCurrency(): Promise<string> {
        return await this.getTyped("currency", "INR");
    }

    async setCurrency(currency: string): Promise<void> {
        await this.set("currency", currency);
    }

    async getTheme(): Promise<"light" | "dark" | "system"> {
        return await this.getTyped("theme", "system");
    }

    async setTheme(theme: "light" | "dark" | "system"): Promise<void> {
        await this.set("theme", theme);
    }

    async getNotificationsEnabled(): Promise<boolean> {
        return await this.getTyped("notificationsEnabled", true);
    }

    async setNotificationsEnabled(enabled: boolean): Promise<void> {
        await this.setTyped("notificationsEnabled", enabled);
    }

    async getBillReminderDays(): Promise<number> {
        return await this.getTyped("billReminderDays", 3);
    }

    async setBillReminderDays(days: number): Promise<void> {
        await this.setTyped("billReminderDays", days);
    }

    async getOnboardingCompleted(): Promise<boolean> {
        return await this.getTyped("onboardingCompleted", false);
    }

    async setOnboardingCompleted(completed: boolean): Promise<void> {
        await this.setTyped("onboardingCompleted", completed);
    }

    async getLastBackupDate(): Promise<Date | null> {
        const date = await this.get("lastBackupDate");
        return date ? new Date(date) : null;
    }

    async setLastBackupDate(date: Date): Promise<void> {
        await this.set("lastBackupDate", date.toISOString());
    }

    // Export all data for backup
    async exportData() {
        return {
            settings: await this.getAllAsObject(),
            timestamp: new Date().toISOString(),
        };
    }

    // Import settings from backup
    async importData(data: Record<string, string>): Promise<void> {
        for (const [key, value] of Object.entries(data)) {
            await this.set(key, value);
        }
    }
}
