import { Permission } from "@/shared/constants/permissions";
import { Role } from "@/shared/constants/roles";
import { getPermissions } from "@/shared/constants/role-permissions";

interface CacheEntry {
  permissions: Permission[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

export class PermissionCache {
  getPermissions(userId: string, role: Role): Permission[] {
    const key = `${userId}:${role}`;
    const entry = cache.get(key);
    
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.permissions;
    }
    
    const permissions = getPermissions(role);
    cache.set(key, {
      permissions,
      timestamp: Date.now(),
    });
    
    return permissions;
  }

  invalidate(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
  }

  invalidateAll(): void {
    cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL_MS) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
  }
}

export const permissionCache = new PermissionCache();
