<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class CacheService
{
    public function remember(string $tag, string $key, int $ttlSeconds, callable $callback): mixed
    {
        return Cache::tags([$tag])->remember($key, $ttlSeconds, $callback);
    }

    public function forget(string $tag, string $key): void
    {
        Cache::tags([$tag])->forget($key);
    }

    public function flushTag(string $tag): void
    {
        Cache::tags([$tag])->flush();
    }
}
