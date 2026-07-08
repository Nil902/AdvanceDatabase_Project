<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

// Collection: print_jobs (MongoDB)
// Tracks certificate/card print lifecycle; attempt history is embedded.
class PrintJob extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'print_jobs';

    protected $fillable = [
        'pg_print_id', 'job_type', 'reference_table', 'reference_id',
        'status', 'priority', 'max_attempts', 'current_attempt', 'next_retry_at',
        'printer_info', 'assigned_at', 'assigned_by_user_id', 'attempts',
        'printed_at', 'dispatched_at', 'delivered_at', 'operator_id',
        'schema_version', 'created_by_user_id',
    ];

    protected $casts = [
        'next_retry_at' => 'datetime',
        'printer_info' => 'array',
        'assigned_at' => 'datetime',
        'attempts' => 'array', // [{attempt_number, started_at, completed_at, result, error_code, error_message, operator_id, printer_id}]
        'printed_at' => 'datetime',
        'dispatched_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    // Helper to append a new attempt atomically without re-fetching the whole document
    public function pushAttempt(array $attempt): void
    {
        $this->push('attempts', $attempt);
        $this->increment('current_attempt');
    }
}
