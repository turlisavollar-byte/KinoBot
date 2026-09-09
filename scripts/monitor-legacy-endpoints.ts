import { db, auditLogsTable } from '@workspace/db';
import { eq, sql, gte, lte, count, desc } from 'drizzle-orm';

interface LegacyEndpointStats {
  endpoint: string;
  totalCalls: number;
  uniqueUsers: number;
  lastUsed: Date | null;
  topUsers: Array<{ userId: string; count: number }>;
}

interface MonitoringReport {
  period: { start: Date; end: Date };
  totalLegacyCalls: number;
  endpoints: LegacyEndpointStats[];
  recommendations: string[];
}

async function getLegacyEndpointStats(
  startDate: Date,
  endDate: Date
): Promise<MonitoringReport> {
  // Query for all legacy endpoint usage
  const legacyLogs = await db
    .select()
    .from(auditLogsTable)
    .where(
      sql`${auditLogsTable.action} = 'WARNING' 
        AND ${auditLogsTable.targetType} = 'CONFIG'
        AND ${auditLogsTable.metadata}->>'deprecation' = 'true'
        AND ${auditLogsTable.createdAt} >= ${startDate}
        AND ${auditLogsTable.createdAt} <= ${endDate}`
    )
    .orderBy(desc(auditLogsTable.createdAt));

  // Group by endpoint
  const endpointMap = new Map<string, LegacyEndpointStats>();

  for (const log of legacyLogs) {
    const endpoint = log.targetId || 'unknown';
    const userId = log.metadata?.userId as string | undefined;

    if (!endpointMap.has(endpoint)) {
      endpointMap.set(endpoint, {
        endpoint,
        totalCalls: 0,
        uniqueUsers: new Set<string>().size,
        lastUsed: log.createdAt,
        topUsers: [],
      });
    }

    const stats = endpointMap.get(endpoint)!;
    stats.totalCalls++;
    stats.lastUsed = log.createdAt;

    // Track unique users and their call counts
    if (userId) {
      const userStats = stats.topUsers.find(u => u.userId === userId);
      if (userStats) {
        userStats.count++;
      } else {
        stats.topUsers.push({ userId, count: 1 });
      }
    }
  }

  // Convert Set to number for unique users
  const endpoints = Array.from(endpointMap.values()).map(stats => ({
    ...stats,
    uniqueUsers: new Set(stats.topUsers.map(u => u.userId)).size,
    topUsers: stats.topUsers.sort((a, b) => b.count - a.count).slice(0, 5),
  }));

  const totalLegacyCalls = endpoints.reduce((sum, e) => sum + e.totalCalls, 0);

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (totalLegacyCalls === 0) {
    recommendations.push('✅ No legacy endpoint usage detected. Safe to remove legacy routes.');
  } else if (totalLegacyCalls < 10) {
    recommendations.push('⚠️ Low legacy endpoint usage. Contact affected users and plan migration.');
  } else if (totalLegacyCalls < 100) {
    recommendations.push('🔶 Moderate legacy endpoint usage. Create migration plan and communicate with users.');
  } else {
    recommendations.push('🔴 High legacy endpoint usage. Immediate migration required. Consider keeping legacy routes longer.');
  }

  if (endpoints.length > 0) {
    const mostUsed = endpoints.sort((a, b) => b.totalCalls - a.totalCalls)[0];
    recommendations.push(`📊 Most used legacy endpoint: ${mostUsed.endpoint} (${mostUsed.totalCalls} calls)`);
  }

  return {
    period: { start: startDate, end: endDate },
    totalLegacyCalls,
    endpoints,
    recommendations,
  };
}

async function printReport(report: MonitoringReport): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('📊 LEGACY ENDPOINT MONITORING REPORT');
  console.log('='.repeat(80));
  console.log(`\nPeriod: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}`);
  console.log(`Total Legacy Calls: ${report.totalLegacyCalls}`);
  console.log(`\nEndpoints Monitored: ${report.endpoints.length}`);

  if (report.endpoints.length === 0) {
    console.log('\n✅ No legacy endpoint usage detected in this period.');
  } else {
    console.log('\n' + '-'.repeat(80));
    console.log('ENDPOINT STATISTICS');
    console.log('-'.repeat(80));

    for (const endpoint of report.endpoints) {
      console.log(`\n📍 ${endpoint.endpoint}`);
      console.log(`   Total Calls: ${endpoint.totalCalls}`);
      console.log(`   Unique Users: ${endpoint.uniqueUsers}`);
      console.log(`   Last Used: ${endpoint.lastUsed?.toISOString() || 'N/A'}`);
      
      if (endpoint.topUsers.length > 0) {
        console.log(`   Top Users:`);
        for (const user of endpoint.topUsers) {
          console.log(`     - ${user.userId}: ${user.count} calls`);
        }
      }
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('-'.repeat(80));
  for (const rec of report.recommendations) {
    console.log(rec);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Parse date range (default: last 7 days)
  const days = args[0] ? parseInt(args[0]) : 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  console.log(`🔍 Monitoring legacy endpoint usage for the last ${days} days...`);

  try {
    const report = await getLegacyEndpointStats(startDate, endDate);
    await printReport(report);
    
    // Exit with different codes based on usage
    if (report.totalLegacyCalls === 0) {
      process.exit(0); // Safe to remove
    } else if (report.totalLegacyCalls < 10) {
      process.exit(1); // Low usage - plan migration
    } else {
      process.exit(2); // High usage - immediate action needed
    }
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(3);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { getLegacyEndpointStats, printReport };
