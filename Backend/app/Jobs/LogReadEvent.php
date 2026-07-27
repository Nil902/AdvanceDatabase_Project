<?php

namespace App\Jobs;

use App\Models\Mongo\AuditEventLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Request;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Records a read/lookup of citizen data to the MongoDB audit_event_logs
 * collection. Runs on the queue so read auditing never slows a request, and
 * writes to Mongo (not the Postgres primary) so the high volume of reads doesn't
 * bloat the operational database.
 *
 * Best-effort: a failure to log a read must never surface to the caller.
 */
class LogReadEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  array<string,mixed>  $meta  user_id, username, role_code, module, action
     * @param  array<string,mixed>  $context  optional extra detail (e.g. search query)
     */
    public function __construct(
        public array $meta,
        public ?string $targetTable = null,
        public ?int $targetId = null,
        public ?string $ipAddress = null,
        public ?string $userAgent = null,
        public array $context = [],
    ) {}

    /**
     * Queue a read-audit for the current request.
     *
     * @param  array<string,mixed>  $context
     */
    public static function record(Request $request, string $module, string $targetTable, ?int $targetId = null, array $context = []): void
    {
        $user = $request->user();

        self::dispatch(
            meta: [
                'user_id' => $user?->user_id,
                'username' => $user?->username,
                'role_code' => $user?->role?->role_code,
                'module' => $module,
                'action' => 'read',
            ],
            targetTable: $targetTable,
            targetId: $targetId,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
            context: $context,
        );
    }

    public function handle(): void
    {
        try {
            AuditEventLog::create([
                'performed_at' => now(),
                'meta' => $this->meta,
                'ip_address' => $this->ipAddress,
                'user_agent' => $this->userAgent,
                'target_table' => $this->targetTable,
                'target_id' => $this->targetId,
                'new_value' => $this->context ?: null,
                'success' => true,
                'schema_version' => 1,
            ]);
        } catch (\Throwable $e) {
            Log::warning('LogReadEvent failed: '.$e->getMessage());
        }
    }
}
