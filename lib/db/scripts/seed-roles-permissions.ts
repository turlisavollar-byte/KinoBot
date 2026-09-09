import {
  db,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
} from "@workspace/db";
import { ROLE_PERMISSIONS } from "../../../artifacts/api-server/src/shared/constants/role-permissions";
import { Permission } from "../../../artifacts/api-server/src/shared/constants/permissions";

async function up() {
  // Insert roles
  const roles = [
    {
      name: "superadmin",
      description: "Super Administrator with full access",
      level: 10,
      isSystem: true,
    },
    {
      name: "admin",
      description: "Administrator with most access",
      level: 8,
      isSystem: true,
    },
    {
      name: "manager",
      description: "Manager with content and user access",
      level: 6,
      isSystem: false,
    },
    {
      name: "moderator",
      description: "Moderator with moderation access",
      level: 5,
      isSystem: false,
    },
    {
      name: "user",
      description: "Standard user with base access",
      level: 4,
      isSystem: false,
    },
    {
      name: "viewer",
      description: "Viewer with read-only access",
      level: 2,
      isSystem: false,
    },
  ];

  for (const r of roles) {
    await db
      .insert(rolesTable)
      .values({
        id: crypto.randomUUID(),
        name: r.name,
        description: r.description,
        level: r.level,
        isSystem: r.isSystem,
      })
      .onConflictDoNothing({ target: rolesTable.name });
  }

  // Insert permissions
  const permissionNames = new Set<string>();
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    for (const p of perms) permissionNames.add(p as string);
  }

  for (const name of Array.from(permissionNames)) {
    await db
      .insert(permissionsTable)
      .values({
        id: crypto.randomUUID(),
        name,
        description: `${name} permission`,
      })
      .onConflictDoNothing({ target: permissionsTable.name });
  }

  // Link role_permissions
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const [roleRow] = await db
      .select()
      .from(rolesTable)
      .where(rolesTable.name.eq(roleName))
      .limit(1);
    if (!roleRow) continue;

    for (const permName of perms) {
      const [permRow] = await db
        .select()
        .from(permissionsTable)
        .where(permissionsTable.name.eq(permName))
        .limit(1);
      if (!permRow) continue;

      await db
        .insert(rolePermissionsTable)
        .values({ roleId: roleRow.id, permissionId: permRow.id })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ] as any,
        });
    }
  }

  console.log("Roles and permissions seeded successfully");
}

up().catch((err) => {
  console.error(err);
  process.exit(1);
});
