<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Admin-only performance telemetry for the PostgreSQL database and the Redis
 * cache/queue, plus a pointer to the pgBadger log-analysis report.
 *
 * Guarded by the `admin:read` ability in routes/api.php — only the admin role
 * (abilities: ['*']) satisfies it.
 */
class PerformanceController extends Controller
{
    // GET /api/v1/admin/performance/database
    public function database(): JsonResponse
    {
        try {
            $dbName = DB::connection()->getDatabaseName();

            $sizeRow = DB::selectOne('SELECT pg_database_size(current_database()) AS bytes, pg_size_pretty(pg_database_size(current_database())) AS pretty');

            $stat = DB::selectOne(
                'SELECT numbackends, xact_commit, xact_rollback, blks_read, blks_hit,
                        tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted,
                        deadlocks, temp_files, temp_bytes
                 FROM pg_stat_database WHERE datname = ?',
                [$dbName]
            );

            $cacheHitRatio = 0.0;
            if ($stat && ($stat->blks_hit + $stat->blks_read) > 0) {
                $cacheHitRatio = round(($stat->blks_hit / ($stat->blks_hit + $stat->blks_read)) * 100, 2);
            }

            $activity = DB::selectOne(
                "SELECT
                    count(*) FILTER (WHERE state = 'active')             AS active,
                    count(*) FILTER (WHERE state = 'idle')               AS idle,
                    count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
                    count(*)                                             AS total,
                    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections
                 FROM pg_stat_activity"
            );

            $tables = DB::select(
                'SELECT relname AS name,
                        n_live_tup AS rows,
                        pg_size_pretty(pg_total_relation_size(relid)) AS size,
                        pg_total_relation_size(relid) AS size_bytes,
                        seq_scan, idx_scan
                 FROM pg_stat_user_tables
                 ORDER BY pg_total_relation_size(relid) DESC
                 LIMIT 10'
            );

            $version = DB::selectOne('SHOW server_version');
            $uptime = DB::selectOne("SELECT date_trunc('second', now() - pg_postmaster_start_time()) AS uptime");

            return response()->json([
                'status' => 'up',
                'database' => $dbName,
                'version' => $version->server_version ?? null,
                'uptime' => (string) ($uptime->uptime ?? ''),
                'size' => [
                    'bytes' => (int) ($sizeRow->bytes ?? 0),
                    'pretty' => $sizeRow->pretty ?? '0 bytes',
                ],
                'connections' => [
                    'active' => (int) ($activity->active ?? 0),
                    'idle' => (int) ($activity->idle ?? 0),
                    'idle_in_transaction' => (int) ($activity->idle_in_transaction ?? 0),
                    'total' => (int) ($activity->total ?? 0),
                    'max' => (int) ($activity->max_connections ?? 0),
                ],
                'cache_hit_ratio' => $cacheHitRatio,
                'transactions' => [
                    'commit' => (int) ($stat->xact_commit ?? 0),
                    'rollback' => (int) ($stat->xact_rollback ?? 0),
                ],
                'tuples' => [
                    'inserted' => (int) ($stat->tup_inserted ?? 0),
                    'updated' => (int) ($stat->tup_updated ?? 0),
                    'deleted' => (int) ($stat->tup_deleted ?? 0),
                    'returned' => (int) ($stat->tup_returned ?? 0),
                    'fetched' => (int) ($stat->tup_fetched ?? 0),
                ],
                'deadlocks' => (int) ($stat->deadlocks ?? 0),
                'temp_files' => (int) ($stat->temp_files ?? 0),
                'tables' => array_map(fn ($t) => [
                    'name' => $t->name,
                    'rows' => (int) $t->rows,
                    'size' => $t->size,
                    'size_bytes' => (int) $t->size_bytes,
                    'seq_scan' => (int) $t->seq_scan,
                    'idx_scan' => (int) ($t->idx_scan ?? 0),
                ], $tables),
            ]);
        } catch (Throwable $e) {
            return response()->json(['status' => 'down', 'error' => $e->getMessage()], 200);
        }
    }

    // GET /api/v1/admin/performance/redis
    public function redis(): JsonResponse
    {
        try {
            $info = Redis::connection()->client()->info();

            // phpredis may return a flat array or sections; normalise access.
            $get = fn (string $key, $default = null) => $info[$key] ?? $default;

            $hits = (int) $get('keyspace_hits', 0);
            $misses = (int) $get('keyspace_misses', 0);
            $hitRate = ($hits + $misses) > 0 ? round(($hits / ($hits + $misses)) * 100, 2) : 0.0;

            // Keyspace: keys like db0 => "keys=12,expires=3,avg_ttl=0"
            $keyspace = [];
            foreach ($info as $k => $v) {
                if (is_string($k) && str_starts_with($k, 'db') && is_string($v)) {
                    preg_match('/keys=(\d+)/', $v, $m);
                    $keyspace[$k] = (int) ($m[1] ?? 0);
                }
            }

            return response()->json([
                'status' => 'up',
                'version' => $get('redis_version'),
                'mode' => $get('redis_mode', 'standalone'),
                'uptime_seconds' => (int) $get('uptime_in_seconds', 0),
                'connected_clients' => (int) $get('connected_clients', 0),
                'memory' => [
                    'used' => $get('used_memory_human'),
                    'used_bytes' => (int) $get('used_memory', 0),
                    'peak' => $get('used_memory_peak_human'),
                    'fragmentation_ratio' => (float) $get('mem_fragmentation_ratio', 0),
                ],
                'stats' => [
                    'total_connections_received' => (int) $get('total_connections_received', 0),
                    'total_commands_processed' => (int) $get('total_commands_processed', 0),
                    'instantaneous_ops_per_sec' => (int) $get('instantaneous_ops_per_sec', 0),
                    'keyspace_hits' => $hits,
                    'keyspace_misses' => $misses,
                    'hit_rate' => $hitRate,
                    'evicted_keys' => (int) $get('evicted_keys', 0),
                    'expired_keys' => (int) $get('expired_keys', 0),
                ],
                'keyspace' => $keyspace,
                'total_keys' => array_sum($keyspace),
            ]);
        } catch (Throwable $e) {
            return response()->json(['status' => 'down', 'error' => $e->getMessage()], 200);
        }
    }

    // GET /api/v1/admin/performance/pgbadger
    public function pgbadger(Request $request): JsonResponse
    {
        // pgBadger reports are served by a dedicated nginx container on port 8081
        // of the deployment host (see docker-compose.prod.yml). Build the URL
        // from the incoming request host so it works in any environment.
        $host = $request->getHost();
        $url = env('PGBADGER_URL', "http://{$host}:8081");

        return response()->json([
            'url' => $url,
            'index_url' => rtrim($url, '/').'/index.html',
            'description' => 'pgBadger analyses PostgreSQL logs and is regenerated automatically every hour (full report nightly).',
        ]);
    }
}
