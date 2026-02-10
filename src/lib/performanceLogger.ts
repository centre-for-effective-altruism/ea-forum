import "server-only";
import type { Pool } from "pg";

// Adapted from https://github.com/drizzle-team/drizzle-orm/issues/2605#issuecomment-3674089897

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

const getQueryType = (query: string): string => {
  const upperQuery = query.trim().toUpperCase();
  if (upperQuery.startsWith("SELECT")) {
    return "SELECT";
  }
  if (upperQuery.startsWith("INSERT")) {
    return "INSERT";
  }
  if (upperQuery.startsWith("UPDATE")) {
    return "UPDATE";
  }
  if (upperQuery.startsWith("DELETE")) {
    return "DELETE";
  }
  return "QUERY";
};

const getTableName = (query: string): string | null => {
  const match = query.match(/(?:FROM|INTO|UPDATE)\s+["`]?(\w+)["`]?/i);
  return match?.[1] ?? null;
};

const getWhereColumns = (query: string): string | null => {
  const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|GROUP|$)/i);
  if (!whereMatch) {
    return null;
  }

  // Extract column names from WHERE clause
  const columns = whereMatch[1].match(/["`]?(\w+)["`]?\s*=/g);
  if (!columns) {
    return null;
  }

  const colNames = columns.map((c) => c.replace(/["`=\s]/g, "")).slice(0, 3);
  return colNames.join(", ");
};

const getColor = (queryType: string): string => {
  switch (queryType) {
    case "SELECT":
      return colors.green;
    case "INSERT":
      return colors.blue;
    case "UPDATE":
      return colors.yellow;
    case "DELETE":
      return colors.red;
    default:
      return colors.dim;
  }
};

const getDurationColor = (duration: number): string => {
  if (duration < 10) {
    return colors.green;
  }
  if (duration < 100) {
    return colors.yellow;
  }
  return colors.red;
};

type ExplainStats = {
  planningTime: number | null;
  executionTime: number | null;
  buffers: { sharedHit?: number; sharedRead?: number } | null;
  indexUsed: string | null;
  rowsReturned: number | null;
};

const parseExplainResult = (
  rows: Array<{ "QUERY PLAN"?: string }>,
): ExplainStats => {
  const stats: ExplainStats = {
    planningTime: null,
    executionTime: null,
    buffers: null,
    indexUsed: null,
    rowsReturned: null,
  };

  // Join all query plan rows into a single string
  const fullText = rows.map((row) => row["QUERY PLAN"] || "").join(" ");

  // Extract Planning Time
  const planningMatch = fullText.match(/Planning Time:\s*([\d.]+)\s*ms/i);
  if (planningMatch) {
    stats.planningTime = parseFloat(planningMatch[1]);
  }

  // Extract Execution Time
  const executionMatch = fullText.match(/Execution Time:\s*([\d.]+)\s*ms/i);
  if (executionMatch) {
    stats.executionTime = parseFloat(executionMatch[1]);
  }

  // Extract Buffer information
  const bufferMatches = fullText.match(
    /Buffers:\s*(?:shared hit=(\d+))?(?:\s*shared read=(\d+))?/i,
  );
  if (bufferMatches) {
    stats.buffers = {};
    if (bufferMatches[1]) stats.buffers.sharedHit = parseInt(bufferMatches[1], 10);
    if (bufferMatches[2]) stats.buffers.sharedRead = parseInt(bufferMatches[2], 10);
  }

  // Extract index usage (look for "Index Scan using" or "Index Only Scan")
  const indexMatch = fullText.match(
    /(?:Index Scan|Index Only Scan)\s+using\s+["`]?([^"`\s]+)["`]?/i,
  );
  if (indexMatch) {
    stats.indexUsed = indexMatch[1];
  }

  // Extract rows returned (from first node, e.g., "rows=1.00" or "rows=1")
  const rowsMatch = fullText.match(/rows=([\d.]+)/i);
  if (rowsMatch) {
    stats.rowsReturned = Math.round(parseFloat(rowsMatch[1]));
  }

  return stats;
};

/**
 * Creates a performance-logging wrapper for pool.query
 * Logs query type, table name, and duration in development mode
 */
export const createPerformanceLogger = (pool: Pool, explainAnalyze: boolean) => {
  const originalQuery = pool.query.bind(pool);
  pool.query = ((...args: Parameters<typeof originalQuery>) => {
    const startTime = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (originalQuery as any)(...args);

    // Only wrap promises (skip callback-based calls which return void/Submittable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (result && typeof (result as any).then === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (result as Promise<any>).then(async (res: any) => {
        const totalDuration = Date.now() - startTime;

        // Extract query text from various argument formats
        let queryText = "";
        if (typeof args[0] === "string") {
          queryText = args[0];
        } else if (
          args[0] &&
          typeof args[0] === "object" &&
          "text" in args[0] &&
          typeof (args[0] as { text?: string }).text === "string"
        ) {
          queryText = (args[0] as { text: string }).text;
        }

        if (queryText) {
          const queryType = getQueryType(queryText);
          const tableName = getTableName(queryText);
          const whereColumns = getWhereColumns(queryText);
          const typeColor = getColor(queryType);
          const durationColor = getDurationColor(totalDuration);

          let line = `${colors.dim}[db]${colors.reset}`;
          line += ` ${typeColor}${queryType}${colors.reset}`;
          if (tableName) {
            line += ` ${tableName}`;
          }
          if (whereColumns) {
            line += ` ${colors.dim}where ${whereColumns}${colors.reset}`;
          }

          // Optionally get detailed stats from EXPLAIN ANALYZE (for SELECT
          // queries only)
          let explainStats: ExplainStats | null = null;
          if (explainAnalyze && queryType === "SELECT") {
            try {
              // Run EXPLAIN ANALYZE to get detailed execution stats
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const explainResult = await (originalQuery as any)({
                text: `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${queryText}`,
                values: args[1],
              });
              if (explainResult?.rows && explainResult.rows.length > 0) {
                explainStats = parseExplainResult(explainResult.rows);
              }
            } catch {
              // Ignore EXPLAIN errors silently
            }
          }

          // Build the log line with timing information
          if (explainStats) {
            // Calculate network/overhead time
            const dbTime =
              (explainStats.executionTime || 0) + (explainStats.planningTime || 0);
            const networkOverhead = totalDuration - dbTime;
            const efficiency = dbTime > 0 ? (dbTime / totalDuration) * 100 : 0;

            // Show total time
            line += ` ${durationColor}${totalDuration}ms${colors.reset}`;

            const details: string[] = [];

            // Show DB execution time
            if (explainStats.executionTime !== null) {
              details.push(`${explainStats.executionTime.toFixed(2)}ms exec`);
            }

            // Show planning time
            if (explainStats.planningTime !== null) {
              details.push(`${explainStats.planningTime.toFixed(2)}ms plan`);
            }

            // Show network overhead if significant (>5ms and >20% of total)
            if (networkOverhead > 5 && efficiency < 80) {
              const overhead = networkOverhead.toFixed(0);
              const overheadColor =
                networkOverhead > 50 ? colors.yellow : colors.dim;
              details.push(`${overheadColor}~${overhead}ms net${colors.reset}`);
            }

            // Show rows returned
            if (explainStats.rowsReturned !== null) {
              const rows = explainStats.rowsReturned !== 1 ? "rows" : "row";
              details.push(`${explainStats.rowsReturned} ${rows}`);
            }

            // Show buffer stats
            if (explainStats.buffers) {
              const bufferParts: string[] = [];
              if (explainStats.buffers.sharedHit) {
                bufferParts.push(`hit=${explainStats.buffers.sharedHit}`);
              }
              if (explainStats.buffers.sharedRead) {
                bufferParts.push(`read=${explainStats.buffers.sharedRead}`);
              }
              if (bufferParts.length > 0) {
                details.push(`buffers: ${bufferParts.join(", ")}`);
              }
            }

            // Show index used
            if (explainStats.indexUsed) {
              details.push(`idx:${explainStats.indexUsed}`);
            }

            if (details.length > 0) {
              line += ` ${colors.dim}(${details.join(", ")})${colors.reset}`;
            }
          } else {
            line += ` ${durationColor}${totalDuration}ms${colors.reset}`;
          }

          // eslint-disable-next-line no-console
          console.log(line);
        }

        return res;
      });
    }

    return result;
  }) as typeof originalQuery;
};
