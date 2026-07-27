<?php

namespace App\Observers;

use App\Models\UserActionLog;
use App\Support\AuditChain;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes an append-only audit row to user_action_logs for every create/update/
 * delete on the observed registry models. Each row chains to the previous row's
 * hash (tamper-evidence — see `php artisan audit:verify`).
 *
 * Actions with no authenticated web user (seeders, console commands) are skipped.
 */
class AuditObserver
{
    /**
     * Attribute-name fragments whose values must never land in the audit trail
     * (password hashes, biometric templates).
     */
    private const REDACT = ['password', 'remember_token', 'fingerprint', 'template', 'biometric'];

    public function created(Model $model): void
    {
        $this->record($model, 'created', null, $this->snapshot($model));
    }

    public function updated(Model $model): void
    {
        $old = [];
        $new = [];

        foreach (array_keys($model->getChanges()) as $key) {
            if ($key === 'updated_at') {
                continue;
            }
            $old[$key] = $model->getOriginal($key);
            $new[$key] = $model->getAttribute($key);
        }

        if (empty($new)) {
            return; // only timestamps changed — nothing worth auditing
        }

        $this->record($model, 'updated', $this->redact($old), $this->redact($new));
    }

    public function deleted(Model $model): void
    {
        $this->record($model, 'deleted', $this->snapshot($model), null);
    }

    private function snapshot(Model $model): array
    {
        return $this->redact($model->getAttributes());
    }

    private function redact(array $attributes): array
    {
        foreach ($attributes as $key => $value) {
            foreach (self::REDACT as $needle) {
                if (str_contains(strtolower($key), $needle)) {
                    $attributes[$key] = '[REDACTED]';
                    break;
                }
            }
        }

        return $attributes;
    }

    private function record(Model $model, string $action, ?array $old, ?array $new): void
    {
        $user = request()?->user();

        if (! $user) {
            return; // system / console / seed context — not attributable to a user
        }

        $core = [
            'user_id' => $user->user_id,
            'action' => $action,
            'target_table' => $model->getTable(),
            'target_id' => $model->getKey(),
            'old_value' => $old,
            'new_value' => $new,
        ];

        // Chain to the most recent row's hash. Note: concurrent writers can race
        // on the "latest" read; acceptable for this system, and audit:verify will
        // flag any resulting fork.
        $prevHash = UserActionLog::orderByDesc('log_id')->value('hash');

        UserActionLog::create($core + [
            'performed_at' => now(),
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 500),
            'prev_hash' => $prevHash,
            'hash' => AuditChain::hash($prevHash, $core),
        ]);
    }
}
