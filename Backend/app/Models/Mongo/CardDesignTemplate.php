<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

// Collection: card_design_templates (MongoDB)
// Versioned, flexible layout definitions for ID card printing.
class CardDesignTemplate extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'card_design_templates';

    protected $fillable = [
        'card_type', 'version', 'version_label', 'is_active',
        'effective_from', 'effective_to', 'template_data', 'dimensions',
        'security_features', 'fonts', 'created_by_user_id',
        'approved_by_user_id', 'approved_at', 'schema_version',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'effective_from' => 'datetime',
        'effective_to' => 'datetime',
        'template_data' => 'array',
        'dimensions' => 'array',
        'security_features' => 'array',
        'fonts' => 'array',
        'approved_at' => 'datetime',
    ];
}
