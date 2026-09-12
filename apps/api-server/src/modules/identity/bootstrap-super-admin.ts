import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";
import { db, adminUsersTable, rolesTable } from "@workspace/db";

function getEnvValue(primary: string, legacy: string): string | undefined {
  return process.env[primary]?.trim() || process.env[legacy]?.trim();
}

export async function bootstrapSuperAdmin(): Promise<void> {
  const email = getEnvValue(
    "SUPER_ADMIN_EMAIL",
    "BOOTSTRAP_ADMIN_EMAIL",
  )?.toLowerCase();
  const password =
    process.env.SUPER_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name =
    getEnvValue("SUPER_ADMIN_NAME", "BOOTSTRAP_ADMIN_NAME") || "Developer";

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
    return;
  }

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    throw new Error(
      "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be provided together",
    );
  }

  if (password.length < 12) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters");
  }

  const [existingUser] = await db
    .select({ id: adminUsersTable.id, role: adminUsersTable.role })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email))
    .limit(1);

  if (existingUser) {
    throw new Error(
      `Cannot bootstrap superadmin: ${email} already belongs to role '${existingUser.role}'`,
    );
  }

  let [superAdminRole] = await db
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(eq(rolesTable.name, "superadmin"))
    .limit(1);

  if (!superAdminRole) {
    [superAdminRole] = await db
      .insert(rolesTable)
      .values({
        name: "superadmin",
        description: "Bootstrap system administrator",
        level: 100,
        isSystem: true,
      })
      .returning({ id: rolesTable.id });
  }

  if (!superAdminRole) {
    throw new Error("Failed to resolve the superadmin role");
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || "12");
  const passwordHash = await bcrypt.hash(password, saltRounds);

  await db.insert(adminUsersTable).values({
    email,
    name,
    passwordHash,
    role: "superadmin",
    roleId: superAdminRole.id,
    isActive: true,
    isEmailVerified: true,
  });

  console.log(`Superadmin bootstrap account created: ${email}`);
}
