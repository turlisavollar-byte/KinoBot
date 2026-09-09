# Legacy Endpoint Monitoring Schedule

## 📋 Overview

This document outlines the daily monitoring schedule for legacy auth endpoints to determine when they can be safely removed.

## 🎯 Objective

Monitor legacy auth endpoint usage for 1-2 weeks to ensure no active clients are using them before removal.

**Legacy Endpoints Being Monitored:**
- `/api/auth/login` → New: `/identity/auth/login`
- `/api/auth/logout` → New: `/identity/auth/logout`
- `/api/auth/me` → New: `/identity/auth/me`

## 📅 Daily Monitoring Procedure

### Step 1: Run Monitoring Script

**Command:**
```bash
cd artifacts/api-server
pnpm monitor:legacy 7
```

**Parameters:**
- `7` - Monitor last 7 days (adjust as needed)
- Can use `1` for daily check, `30` for monthly review

### Step 2: Review Results

**Expected Output:**
```
================================================================================
📊 LEGACY ENDPOINT MONITORING REPORT
================================================================================

Period: 2024-08-XXT00:00:00.000Z to 2024-08-XXT00:00:00.000Z
Total Legacy Calls: 0

Endpoints Monitored: 0

✅ No legacy endpoint usage detected in this period.

--------------------------------------------------------------------------------
RECOMMENDATIONS
--------------------------------------------------------------------------------
✅ No legacy endpoint usage detected. Safe to remove legacy routes.
```

**Exit Codes:**
- `0` - No usage detected (safe to remove)
- `1` - Low usage (<10 calls) - plan migration
- `2` - High usage (≥10 calls) - immediate action needed
- `3` - Error occurred

### Step 3: Log Results

Create a daily log entry in `docs/legacy-monitoring-log.md`:

```markdown
## 2024-08-XX

**Monitoring Period:** Last 7 days
**Total Legacy Calls:** 0
**Exit Code:** 0
**Status:** ✅ No usage detected
**Notes:** 
```

## 📊 Monitoring Timeline

| Date | Total Calls | Status | Notes |
|------|-------------|--------|-------|
| 2024-08-11 | 0 | ✅ | Initial monitoring |
| 2024-08-12 | ? | ? | To be checked |
| 2024-08-13 | ? | ? | To be checked |
| ... | ... | ... | ... |
| 2024-08-18 | ? | ? | 1-week milestone |
| 2024-08-25 | ? | ? | 2-week milestone |

## ⚠️ Decision Criteria

### Safe to Remove (Exit Code 0)
- **Condition:** 0 legacy endpoint calls for 7 consecutive days
- **Action:** Proceed with legacy route removal
- **Timeline:** After 1-2 weeks of monitoring

### Plan Migration (Exit Code 1)
- **Condition:** <10 legacy endpoint calls in monitoring period
- **Action:** 
  1. Identify affected users from audit logs
  2. Contact users with migration instructions
  3. Provide support for migration
  4. Continue monitoring
- **Timeline:** Extend monitoring period

### Immediate Action (Exit Code 2)
- **Condition:** ≥10 legacy endpoint calls in monitoring period
- **Action:**
  1. Investigate which endpoints are being used
  2. Identify top users from audit logs
  3. Create urgent migration plan
  4. Consider extending deprecation period
  5. Communicate with all stakeholders
- **Timeline:** Pause removal, reassess timeline

## 🔍 Audit Log Queries

### Check Specific Endpoint Usage
```sql
SELECT 
  target_id,
  COUNT(*) as call_count,
  MAX(created_at) as last_used
FROM audit_logs
WHERE action = 'WARNING'
  AND target_type = 'CONFIG'
  AND metadata->>'deprecation' = 'true'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY target_id
ORDER BY call_count DESC;
```

### Check Top Users
```sql
SELECT 
  metadata->>'userId' as user_id,
  target_id,
  COUNT(*) as call_count
FROM audit_logs
WHERE action = 'WARNING'
  AND target_type = 'CONFIG'
  AND metadata->>'deprecation' = 'true'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id, target_id
ORDER BY call_count DESC
LIMIT 10;
```

## 📝 Monitoring Checklist

Daily:
- [ ] Run `pnpm monitor:legacy 7`
- [ ] Review exit code and recommendations
- [ ] Log results in monitoring log
- [ ] Check for any unexpected usage patterns
- [ ] Review audit logs if usage detected

Weekly:
- [ ] Review 7-day trend
- [ ] Update monitoring timeline table
- [ ] Assess if removal criteria are met
- [ ] Communicate status to team

## 🚨 Escalation Procedures

### If Usage Detected
1. **Immediate:** Run detailed audit log query
2. **Investigation:** Identify which users/clients are using legacy endpoints
3. **Communication:** Notify development team and stakeholders
4. **Action:** Create migration plan for affected users
5. **Monitoring:** Increase monitoring frequency to daily

### If Error Occurs (Exit Code 3)
1. **Check:** Database connection
2. **Verify:** Environment variables (DATABASE_URL)
3. **Review:** Audit logs table structure
4. **Fix:** Resolve issue and retry monitoring

## 📞 Contacts

- **Development Team:** [Contact info]
- **DevOps Team:** [Contact info]
- **Product Owner:** [Contact info]

## 🎯 Success Criteria

**Legacy routes can be removed when:**
- ✅ 0 legacy endpoint calls for 7 consecutive days
- ✅ All frontend/clients migrated to new endpoints
- ✅ Integration tests passing
- ✅ Documentation updated
- ✅ Team approval obtained

## 📅 Milestones

- **Day 1 (2024-08-11):** Initial monitoring - 0 calls ✅
- **Day 7 (2024-08-18):** 1-week milestone assessment
- **Day 14 (2024-08-25):** 2-week milestone - final decision

## 🔄 Post-Removal Tasks

After legacy routes are removed:
1. Update API documentation
2. Remove deprecation warnings from new endpoints
3. Clean up monitoring scripts
4. Archive monitoring logs
5. Update migration guide
6. Notify all stakeholders
