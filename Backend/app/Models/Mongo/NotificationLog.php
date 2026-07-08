<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

// Collection: notification_logs (MongoDB)
// One append-only document per send attempt (SMS/email/push/in-app).
class NotificationLog extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'notification_logs';

    public $timestamps = false; // queued_at/sent_at/delivered_at cover lifecycle

    protected $fillable = [
        'citizen_id', 'officer_id', 'user_id', 'recipient_label',
        'channel', 'recipient_address', 'event_type',
        'reference_table', 'reference_id',
        'message_subject', 'message_content', 'template_id', 'locale',
        'status', 'provider', 'provider_msg_id', 'provider_response',
        'error_code', 'error_message', 'retry_count', 'next_retry_at',
        'queued_at', 'sent_at', 'delivered_at', 'schema_version',
    ];

    protected $casts = [
        'provider_response' => 'array',
        'next_retry_at' => 'datetime',
        'queued_at' => 'datetime',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];
}
