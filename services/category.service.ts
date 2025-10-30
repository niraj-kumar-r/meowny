import type { Category, NewCategory } from "@/db/schema";
import { categories } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";

export class CategoryService {
    constructor(private db: ReturnType<typeof drizzle>) {}

    // Create a new category
    async create(
        category: Omit<NewCategory, "id" | "createdAt">,
    ): Promise<Category> {
        const id = crypto.randomUUID();

        const [newCategory] = await this.db
            .insert(categories)
            .values({
                ...category,
                id,
                createdAt: new Date(),
            })
            .returning();

        return newCategory;
    }

    // Get all categories
    async getAll(): Promise<Category[]> {
        return await this.db.select().from(categories);
    }

    // Get category by ID
    async getById(id: string): Promise<Category | undefined> {
        const [category] = await this.db
            .select()
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);

        return category;
    }

    // Get categories by type
    async getByType(type: "expense" | "income"): Promise<Category[]> {
        return await this.db
            .select()
            .from(categories)
            .where(eq(categories.type, type));
    }

    // Get parent categories (no parentId)
    async getParentCategories(): Promise<Category[]> {
        return await this.db
            .select()
            .from(categories)
            .where(isNull(categories.parentId));
    }

    // Get subcategories of a parent
    async getSubcategories(parentId: string): Promise<Category[]> {
        return await this.db
            .select()
            .from(categories)
            .where(eq(categories.parentId, parentId));
    }

    // Get categories with their subcategories
    async getCategoriesWithSubs(): Promise<
        (Category & { subcategories: Category[] })[]
    > {
        const allCategories = await this.getAll();
        const parentCategories = allCategories.filter((c) => !c.parentId);

        return parentCategories.map((parent) => ({
            ...parent,
            subcategories: allCategories.filter(
                (c) => c.parentId === parent.id,
            ),
        }));
    }

    // Update category
    async update(
        id: string,
        data: Partial<Omit<Category, "id" | "createdAt">>,
    ): Promise<Category> {
        const [updated] = await this.db
            .update(categories)
            .set(data)
            .where(eq(categories.id, id))
            .returning();

        return updated;
    }

    // Delete category
    async delete(id: string): Promise<void> {
        // First, delete all subcategories
        await this.db.delete(categories).where(eq(categories.parentId, id));

        // Then delete the category itself
        await this.db.delete(categories).where(eq(categories.id, id));
    }

    // Seed default categories
    async seedDefaultCategories(): Promise<void> {
        const defaultCategories: Omit<NewCategory, "id" | "createdAt">[] = [
            // Expense categories
            {
                name: "Food & Dining",
                type: "expense",
                icon: "🍔",
                color: "#FF6B6B",
            },
            {
                name: "Transportation",
                type: "expense",
                icon: "🚗",
                color: "#4ECDC4",
            },
            { name: "Shopping", type: "expense", icon: "🛍️", color: "#95E1D3" },
            {
                name: "Entertainment",
                type: "expense",
                icon: "🎮",
                color: "#F38181",
            },
            {
                name: "Bills & Utilities",
                type: "expense",
                icon: "💡",
                color: "#AA96DA",
            },
            {
                name: "Healthcare",
                type: "expense",
                icon: "🏥",
                color: "#FCBAD3",
            },
            {
                name: "Education",
                type: "expense",
                icon: "📚",
                color: "#A8D8EA",
            },
            {
                name: "Personal Care",
                type: "expense",
                icon: "💅",
                color: "#FFD3B6",
            },
            { name: "Travel", type: "expense", icon: "✈️", color: "#FFAAA5" },
            {
                name: "Investments",
                type: "expense",
                icon: "📈",
                color: "#FF8B94",
            },
            {
                name: "Gifts & Donations",
                type: "expense",
                icon: "🎁",
                color: "#A8E6CF",
            },
            {
                name: "Other Expenses",
                type: "expense",
                icon: "📦",
                color: "#C7CEEA",
            },

            // Income categories
            { name: "Salary", type: "income", icon: "💰", color: "#06D6A0" },
            { name: "Freelance", type: "income", icon: "💼", color: "#118AB2" },
            { name: "Business", type: "income", icon: "🏢", color: "#073B4C" },
            {
                name: "Investments",
                type: "income",
                icon: "📊",
                color: "#EF476F",
            },
            { name: "Gifts", type: "income", icon: "🎁", color: "#FFD166" },
            {
                name: "Other Income",
                type: "income",
                icon: "💵",
                color: "#06D6A0",
            },
        ];

        for (const category of defaultCategories) {
            await this.create(category);
        }
    }
}
