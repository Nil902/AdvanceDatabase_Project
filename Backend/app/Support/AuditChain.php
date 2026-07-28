<?php

namespace App\Support;

use App\Models\UserActionLog;

/**
 * Builds the tamper-evidence hash chain for user_action_logs. Used by both the
 * writer (AuditObserver) and the verifier (audit:verify) so the two can never
 * drift.
 *
 * Only deterministic, exactly-reproducible columns are chained (who / action /
 * target / old / new). performed_at is intentionally excluded — timestamp
 * precision/rounding on round-trip would produce false tamper reports; it is not
 * chain-protected.
 */
class AuditChain
{
    /**
     * @param  UserActionLog|array<string,mixed>  $row
     */
    public static function payload(UserActionLog|array $row): string
    {
        $get = fn (string $k) => is_array($row) ? ($row[$k] ?? null) : $row->{$k};

        return json_encode([
            'user_id' => (int) $get('user_id'),
            'action' => (string) $get('action'),
            'target_table' => $get('target_table'),
            'target_id' => $get('target_id') === null ? null : (int) $get('target_id'),
            'old_value' => $get('old_value'),
            'new_value' => $get('new_value'),
        ]);
    }

    /**
     * @param  UserActionLog|array<string,mixed>  $row
     */
    public static function hash(?string $prevHash, UserActionLog|array $row): string
    {
        return hash('sha256', ($prevHash ?? '').self::payload($row));
    }

    /**
     * Append one chained audit row. Used for events that aren't model
     * create/update/delete (e.g. login/logout), which the AuditObserver can't
     * see. Chains to the latest row's hash exactly like the observer does.
     *
     * @param  array{user_id:int,action:string,target_table:?string,target_id:mixed,old_value:?array,new_value:?array}  $core
     */
    public static function append(array $core, ?string $ip = null, ?string $userAgent = null): void
    {
        $prevHash = UserActionLog::orderByDesc('log_id')->value('hash');

        UserActionLog::create($core + [
            'performed_at' => now(),
            'ip_address' => $ip,
            'user_agent' => $userAgent ? substr($userAgent, 0, 500) : null,
            'prev_hash' => $prevHash,
            'hash' => self::hash($prevHash, $core),
        ]);
    }
}
