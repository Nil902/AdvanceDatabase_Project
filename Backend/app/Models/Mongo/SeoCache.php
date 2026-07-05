<?php

namespace App\Models\Mongo;

use Jenssegers\Mongodb\Eloquent\Model;

// Collection: seo_cache (MongoDB)
// Server-rendered HTML cache with a TTL index on expires_at.
class SeoCache extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'seo_cache';

    protected $fillable = [
        'url_path', 'locale', 'cache_key', 'rendered_html',
        'meta_title', 'meta_description', 'og_tags', 'structured_data', 'http_headers',
        'cached_at', 'expires_at', 'ttl_seconds', 'invalidated_at', 'invalidated_by_user_id',
        'hit_count', 'last_hit_at', 'schema_version',
    ];

    protected $casts = [
        'og_tags' => 'array',
        'structured_data' => 'array',
        'http_headers' => 'array',
        'cached_at' => 'datetime',
        'expires_at' => 'datetime',
        'invalidated_at' => 'datetime',
        'last_hit_at' => 'datetime',
    ];
}
