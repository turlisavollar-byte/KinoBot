// =============================================================================
// StreamOps - Database Seed Script
// Creates initial data for production deployment
// =============================================================================

import { db } from "./index";
import {
  adminUsersTable,
  genresTable,
  movieGenresTable,
  moviesTable,
  rolesTable,
  seriesGenresTable,
  seriesTable,
  subscriptionPlansTable,
} from "./schema";
import { eq, isNull, or } from "drizzle-orm";
import bcrypt from "bcrypt";

async function bootstrapAdmin(): Promise<void> {
  const email = (
    process.env.SUPER_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL
  )
    ?.trim()
    .toLowerCase();
  const password =
    process.env.SUPER_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password) {
    throw new Error(
      "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be provided together",
    );
  }
  if (password.length < 12) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters");
  }

  const [existingSuperAdmin] = await db
    .select({ id: adminUsersTable.id })
    .from(adminUsersTable)
    .leftJoin(rolesTable, eq(adminUsersTable.roleId, rolesTable.id))
    .where(
      or(
        eq(adminUsersTable.role, "superadmin"),
        eq(rolesTable.name, "superadmin"),
      ),
    )
    .limit(1);
  if (existingSuperAdmin) {
    console.log("Superadmin bootstrap skipped; a superadmin already exists");
    return;
  }

  const [superAdminRole] = await db
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(eq(rolesTable.name, "superadmin"))
    .limit(1);
  if (!superAdminRole) {
    throw new Error(
      "Superadmin role is not configured; run the RBAC seed first",
    );
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || "12");
  const passwordHash = await bcrypt.hash(password, saltRounds);
  await db.insert(adminUsersTable).values({
    email,
    name:
      (
        process.env.SUPER_ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME
      )?.trim() || "Developer",
    passwordHash,
    role: "superadmin",
    roleId: superAdminRole.id,
    isActive: true,
    isEmailVerified: true,
  });
  console.log(`Superadmin bootstrap account created: ${email}`);
}

const demoMovies = [
  {
    slug: "the-glass-harbor",
    title: "The Glass Harbor",
    year: 2025,
    duration: 112,
    rating: "8.1",
    genre: "drama",
    description:
      "A coastal archivist uncovers a family secret hidden in the records of a fading port.",
  },
  {
    slug: "orbit-of-silence",
    title: "Orbit of Silence",
    year: 2024,
    duration: 128,
    rating: "7.9",
    genre: "sci-fi",
    description:
      "A research crew must restore contact after an orbital station goes dark.",
  },
  {
    slug: "midnight-parcel",
    title: "Midnight Parcel",
    year: 2024,
    duration: 96,
    rating: "7.4",
    genre: "comedy",
    description:
      "A courier mix-up sends one package on an unexpectedly joyful journey.",
  },
  {
    slug: "ember-district",
    title: "Ember District",
    year: 2023,
    duration: 121,
    rating: "8.0",
    genre: "action",
    description:
      "A volunteer rescue team races to evacuate a town before a wildfire changes direction.",
  },
  {
    slug: "the-quiet-signal",
    title: "The Quiet Signal",
    year: 2023,
    duration: 109,
    rating: "7.8",
    genre: "thriller",
    description:
      "A radio host receives a late-night transmission that predicts events across the city.",
  },
  {
    slug: "paper-moons",
    title: "Paper Moons",
    year: 2022,
    duration: 104,
    rating: "7.6",
    genre: "romance",
    description:
      "Two illustrators reconnect while restoring a historic cinema's hand-painted signs.",
  },
  {
    slug: "mosslight",
    title: "Mosslight",
    year: 2022,
    duration: 92,
    rating: "8.3",
    genre: "animation",
    description:
      "A young mapmaker and a tiny forest guardian search for a vanished spring.",
  },
  {
    slug: "the-last-orchard",
    title: "The Last Orchard",
    year: 2021,
    duration: 117,
    rating: "7.7",
    genre: "family",
    description:
      "Three siblings return home to save their grandmother's community orchard.",
  },
  {
    slug: "northbound-kitchen",
    title: "Northbound Kitchen",
    year: 2021,
    duration: 101,
    rating: "7.5",
    genre: "documentary",
    description:
      "A traveling cook follows seasonal ingredients through remote northern villages.",
  },
  {
    slug: "red-window",
    title: "Red Window",
    year: 2020,
    duration: 114,
    rating: "7.9",
    genre: "drama",
    description:
      "A building caretaker investigates a light appearing in a sealed apartment.",
  },
  {
    slug: "blue-hour-run",
    title: "Blue Hour Run",
    year: 2025,
    duration: 107,
    rating: "7.8",
    genre: "action",
    description:
      "A night-shift bicycle courier becomes the witness to a city-wide art heist.",
  },
  {
    slug: "small-weather",
    title: "Small Weather",
    year: 2024,
    duration: 99,
    rating: "7.6",
    genre: "drama",
    description:
      "A school science club helps its town prepare for an unusual storm season.",
  },
  {
    slug: "candlewick-lane",
    title: "Candlewick Lane",
    year: 2023,
    duration: 103,
    rating: "7.3",
    genre: "horror",
    description:
      "Neighbors in an old row house discover that the basement lights answer questions.",
  },
  {
    slug: "second-first-day",
    title: "Second First Day",
    year: 2022,
    duration: 98,
    rating: "7.7",
    genre: "comedy",
    description:
      "A retired teacher takes a temporary job at the school where she began her career.",
  },
  {
    slug: "a-map-of-tomorrow",
    title: "A Map of Tomorrow",
    year: 2020,
    duration: 123,
    rating: "8.2",
    genre: "sci-fi",
    description:
      "A cartographer tests a device that reveals one possible version of the next day.",
  },
];

const demoSeries = [
  {
    slug: "lantern-coast",
    title: "Lantern Coast",
    year: 2025,
    rating: "8.4",
    genre: "drama",
    description:
      "A lighthouse keeper's family helps a changing island community find its way forward.",
  },
  {
    slug: "the-greenhouse-club",
    title: "The Greenhouse Club",
    year: 2024,
    rating: "7.9",
    genre: "comedy",
    description:
      "Neighbors turn an abandoned greenhouse into the center of their block.",
  },
  {
    slug: "signal-seven",
    title: "Signal Seven",
    year: 2023,
    rating: "8.2",
    genre: "sci-fi",
    description:
      "Seven strangers receive the same message from a research station that does not exist.",
  },
  {
    slug: "old-town-detectives",
    title: "Old Town Detectives",
    year: 2022,
    rating: "8.0",
    genre: "thriller",
    description:
      "Two local librarians solve small mysteries that uncover a larger town secret.",
  },
  {
    slug: "paper-planets",
    title: "Paper Planets",
    year: 2021,
    rating: "7.8",
    genre: "animation",
    description:
      "A family of inventors builds imaginative machines from everyday materials.",
  },
  {
    slug: "after-the-rain-market",
    title: "After the Rain Market",
    year: 2020,
    rating: "7.7",
    genre: "family",
    description:
      "Weekend market vendors support one another through a year of change.",
  },
];

async function seedDemoCatalog(): Promise<void> {
  const genres = await db
    .select({ id: genresTable.id, slug: genresTable.slug })
    .from(genresTable)
    .where(isNull(genresTable.deletedAt));
  const genreIds = new Map(genres.map((genre) => [genre.slug, genre.id]));

  for (const movie of demoMovies) {
    const [existing] = await db
      .select({ id: moviesTable.id })
      .from(moviesTable)
      .where(eq(moviesTable.id, movie.slug))
      .limit(1);
    if (!existing) {
      await db.insert(moviesTable).values({
        id: movie.slug,
        title: movie.title,
        description: movie.description,
        releaseYear: movie.year,
        duration: movie.duration,
        posterUrl: `https://placehold.co/300x450?text=${encodeURIComponent(movie.title)}`,
        backgroundUrl: `https://placehold.co/1600x900?text=${encodeURIComponent(movie.title)}`,
        ratingAvg: movie.rating,
        sourceType: "external",
        isPublished: true,
      });
      console.log(`✅ Demo movie created: ${movie.title}`);
    }
    const genreId = genreIds.get(movie.genre);
    if (genreId) {
      await db
        .insert(movieGenresTable)
        .values({ movieId: movie.slug, genreId })
        .onConflictDoNothing();
    }
  }

  for (const series of demoSeries) {
    const [existing] = await db
      .select({ id: seriesTable.id })
      .from(seriesTable)
      .where(eq(seriesTable.id, series.slug))
      .limit(1);
    if (!existing) {
      await db.insert(seriesTable).values({
        id: series.slug,
        title: series.title,
        description: series.description,
        releaseYear: series.year,
        seasonsCount: 1,
        posterUrl: `https://placehold.co/300x450?text=${encodeURIComponent(series.title)}`,
        backgroundUrl: `https://placehold.co/1600x900?text=${encodeURIComponent(series.title)}`,
        ratingAvg: series.rating,
        sourceType: "external",
        isPublished: true,
      });
      console.log(`✅ Demo series created: ${series.title}`);
    }
    const genreId = genreIds.get(series.genre);
    if (genreId) {
      await db
        .insert(seriesGenresTable)
        .values({ seriesId: series.slug, genreId })
        .onConflictDoNothing();
    }
  }
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

    console.log("Creating demo catalog content...");
    await seedDemoCatalog();

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
