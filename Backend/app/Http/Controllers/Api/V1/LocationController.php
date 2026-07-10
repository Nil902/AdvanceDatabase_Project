<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Commune;
use App\Models\District;
use App\Models\Province;
use App\Models\Village;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

class LocationController extends Controller
{
    private const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

    public function provinces(): JsonResponse
    {
        $data = Cache::store('redis')->remember('locations:provinces', self::CACHE_TTL, function () {
            return Province::select('province_id', 'province_code', 'province_name_kh', 'province_name_en')
                ->orderBy('province_code')
                ->get();
        });

        return response()->json(['data' => $data]);
    }

    public function districts(string $provinceCode): JsonResponse
    {
        $data = Cache::store('redis')->remember("locations:districts:{$provinceCode}", self::CACHE_TTL, function () use ($provinceCode) {
            return District::select('district_id', 'district_code', 'district_name_kh', 'district_name_en', 'province_id')
                ->whereHas('province', fn($q) => $q->where('province_code', $provinceCode))
                ->orderBy('district_code')
                ->get();
        });

        return response()->json(['data' => $data]);
    }

    public function communes(string $districtCode): JsonResponse
    {
        $data = Cache::store('redis')->remember("locations:communes:{$districtCode}", self::CACHE_TTL, function () use ($districtCode) {
            return Commune::select('commune_id', 'commune_code', 'commune_name_kh', 'commune_name_en', 'district_id')
                ->whereHas('district', fn($q) => $q->where('district_code', $districtCode))
                ->orderBy('commune_code')
                ->get();
        });

        return response()->json(['data' => $data]);
    }

    public function villages(string $communeCode): JsonResponse
    {
        $data = Cache::store('redis')->remember("locations:villages:{$communeCode}", self::CACHE_TTL, function () use ($communeCode) {
            return Village::select('village_id', 'village_code', 'village_name_kh', 'village_name_en', 'commune_id')
                ->whereHas('commune', fn($q) => $q->where('commune_code', $communeCode))
                ->orderBy('village_code')
                ->get();
        });

        return response()->json(['data' => $data]);
    }

    public function clearCache(): JsonResponse
    {
        $prefix = config('cache.prefix');
        $redis = Redis::connection();
        $keys = $redis->keys("{$prefix}locations:*");

        foreach ($keys as $key) {
            $redis->del($key);
        }

        return response()->json(['message' => 'Location cache cleared']);
    }
}
