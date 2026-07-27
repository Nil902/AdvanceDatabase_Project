<?php

namespace App\Console\Commands;

use App\Models\UserActionLog;
use App\Support\AuditChain;
use Illuminate\Console\Command;

class VerifyAuditChain extends Command
{
    protected $signature = 'audit:verify';

    protected $description = 'Verify the tamper-evidence hash chain of user_action_logs';

    public function handle(): int
    {
        $total = 0;
        $contentBreaks = 0;
        $linkBreaks = 0;
        $expectedPrev = null; // hash of the previous row in log_id order

        UserActionLog::orderBy('log_id')->chunkById(1000, function ($rows) use (&$total, &$contentBreaks, &$linkBreaks, &$expectedPrev) {
            foreach ($rows as $row) {
                $total++;

                // 1. Content integrity — recompute this row's hash from its stored
                //    fields; a mismatch means the row's content was altered.
                $recomputed = AuditChain::hash($row->prev_hash, $row);
                if (! hash_equals((string) $row->hash, $recomputed)) {
                    $contentBreaks++;
                    $this->warn("log_id={$row->log_id}: content hash mismatch (row altered after write).");
                }

                // 2. Chain linkage — prev_hash must equal the previous row's hash;
                //    a mismatch means a row was inserted, deleted, or reordered.
                if ($row->prev_hash !== $expectedPrev) {
                    $linkBreaks++;
                    $this->warn("log_id={$row->log_id}: prev_hash does not match the previous row (insert/delete/reorder, or a concurrent-write fork).");
                }

                $expectedPrev = $row->hash;
            }
        });

        $this->info("Verified {$total} audit row(s).");

        if ($contentBreaks === 0 && $linkBreaks === 0) {
            $this->info('✅ Audit chain intact.');

            return self::SUCCESS;
        }

        $this->error("❌ Integrity failures: {$contentBreaks} altered row(s), {$linkBreaks} link break(s).");

        return self::FAILURE;
    }
}
