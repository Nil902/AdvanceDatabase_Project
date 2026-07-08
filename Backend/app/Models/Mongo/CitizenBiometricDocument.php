<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

// Collection: citizen_biometrics (MongoDB)
// Stores the actual biometric payloads. The Postgres table of the same
// concept (App\Models\CitizenBiometric) only holds a pointer to this doc.
class CitizenBiometricDocument extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'citizen_biometrics';

    protected $fillable = [
        'citizen_id', 'pg_biometric_id', 'captured_by_officer_id',
        'captured_at', 'capture_location', 'session_id',
        'quality_scores', 'fingers_captured_mask',
        'fingerprint_templates', 'fingerprint_images', 'facial_image', 'iris_images',
        'device_info', 'is_active', 'superseded_by', 'schema_version',
        'created_by_user_id', 'updated_by_user_id',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
        'quality_scores' => 'array',
        'fingerprint_templates' => 'array',
        'fingerprint_images' => 'array',
        'facial_image' => 'array',
        'iris_images' => 'array',
        'device_info' => 'array',
        'is_active' => 'boolean',
    ];
}
