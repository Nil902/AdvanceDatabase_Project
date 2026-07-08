<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

// Collection: audit_event_logs (MongoDB time-series collection on performed_at)
// Immutable append-only log — never update or delete documents here.
class AuditEventLog extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'audit_event_logs';

    public $timestamps = false; // append-only; performed_at is the only time field

    protected $fillable = [
        'performed_at', 'meta', 'session_token', 'ip_address', 'user_agent',
        'request_id', 'target_table', 'target_id', 'target_mongo_id',
        'old_value', 'new_value', 'diff_summary', 'success',
        'error_code', 'error_message', 'schema_version',
    ];

    protected $casts = [
        'performed_at' => 'datetime',
        'meta' => 'array', // user_id, username, role_code, module, action, commune_id, province_id
        'old_value' => 'array',
        'new_value' => 'array',
        'diff_summary' => 'array',
        'success' => 'boolean',
    ];
}
