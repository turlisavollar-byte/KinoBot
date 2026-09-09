// =============================================================================
// StreamOps - Database Seed Script
// Creates initial data for production deployment
// =============================================================================

import { db } from "./index";
import { adminUsersTable, genresTable, subscriptionPlansTable } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function bootstrapAdmin(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be provided together",
    );
  }
  if (password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters");
  }

  const [existingAdmin] = await db
    .select({ id: adminUsersTable.id })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email))
    .limit(1);
  if (existingAdmin) {
    console.log(`Admin bootstrap skipped; account already exists: ${email}`);
    return;
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || "12");
  const passwordHash = await bcrypt.hash(password, saltRounds);
  await db.insert(adminUsersTable).values({
    email,
    name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Administrator",
    passwordHash,
    role: "admin",
    isActive: true,
  });
  console.log(`Admin bootstrap account created: ${email}`);
}

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    await bootstrapAdmin();

    // Create default genres
    console.log("Creating default genres...");
    const defaultGenres = [
      { name: "Drama", slug: "drama" },
      { name: "Comedy", slug: "comedy" },
      { name: "Action", slug: "action" },
      { name: "Horror", slug: "horror" },
      { name: "Romance", slug: "romance" },
      { name: "Thriller", slug: "thriller" },
      { name: "Science Fiction", slug: "sci-fi" },
      { name: "Animation", slug: "animation" },
      { name: "Documentary", slug: "documentary" },
      { name: "Family", slug: "family" },
    ];

    for (const genre of defaultGenres) {
      const [existing] = await db
        .select()
        .from(genresTable)
        .where(eq(genresTable.slug, genre.slug))
        .limit(1);

      if (!existing) {
        await db.insert(genresTable).values(genre);
        console.log(`✅ Genre created: ${genre.name}`);
      }
    }

    // Create default subscription plans
    console.log("Creating default subscription plans...");
    const defaultPlans = [
      {
        name: "Weekly",
        tier: "basic",
        description: "1 week access to all content",
        price: "15000", // 15,000 UZS
        currency: "UZS",
        durationDays: 7,
        maxDevices: 1,
        isActive: true,
      },
      {
        name: "Monthly",
        tier: "standard",
        description: "1 month access to all content",
        price: "50000", // 50,000 UZS
        currency: "UZS",
        durationDays: 30,
        maxDevices: 1,
        isActive: true,
      },
      {
        name: "Quarterly",
        tier: "premium",
        description: "3 months access to all content - Save 20%",
        price: "120000", // 120,000 UZS
        currency: "UZS",
        durationDays: 90,
        maxDevices: 2,
        isActive: true,
      },
      {
        name: "Annual",
        tier: "premium",
        description: "1 year access to all content - Save 40%",
        price: "360000", // 360,000 UZS
        currency: "UZS",
        durationDays: 365,
        maxDevices: 3,
        isActive: true,
      },
    ];

    for (const plan of defaultPlans) {
      const [existing] = await db
        .select()
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.name, plan.name))
        .limit(1);

      if (!existing) {
        await db.insert(subscriptionPlansTable).values(plan);
        console.log(`✅ Subscription plan created: ${plan.name}`);
      }
    }

    console.log("🎉 Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run seed
seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
