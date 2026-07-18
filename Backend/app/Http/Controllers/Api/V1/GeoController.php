<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

// Reference data for cascading address pickers (province → district → commune → village).
// Read-only and fully static, so every response is Redis-cached (7 days). Values are
// cached as plain arrays — caching a DB Collection of stdClass and reading it back
// yields a broken __PHP_Incomplete_Class in the JSON.
class GeoController extends Controller
{
    private const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

    public function provinces()
    {
        $data = Cache::remember('geo:provinces', self::CACHE_TTL, function () {
            return DB::table('provinces')
                ->select('province_id as id', 'province_code as code', 'province_name_en as name_en', 'province_name_kh as name_kh')
                ->orderBy('province_name_en')
                ->get()
                ->map(fn ($r) => (array) $r)
                ->all();
        });

        return response()->json($data);
    }

    public function districts(Request $request)
    {
        $request->validate(['province_id' => 'required|integer']);
        $provinceId = $request->integer('province_id');

        $data = Cache::remember("geo:districts:{$provinceId}", self::CACHE_TTL, function () use ($provinceId) {
            return DB::table('districts')
                ->where('province_id', $provinceId)
                ->select('district_id as id', 'district_code as code', 'district_name_en as name_en', 'district_name_kh as name_kh')
                ->orderBy('district_name_en')
                ->get()
                ->map(fn ($r) => (array) $r)
                ->all();
        });

        return response()->json($data);
    }

    public function communes(Request $request)
    {
        $request->validate(['district_id' => 'required|integer']);
        $districtId = $request->integer('district_id');

        $data = Cache::remember("geo:communes:{$districtId}", self::CACHE_TTL, function () use ($districtId) {
            return DB::table('communes')
                ->where('district_id', $districtId)
                ->select('commune_id as id', 'commune_code as code', 'commune_name_en as name_en', 'commune_name_kh as name_kh')
                ->orderBy('commune_name_en')
                ->get()
                ->map(fn ($r) => (array) $r)
                ->all();
        });

        return response()->json($data);
    }

    public function villages(Request $request)
    {
        $request->validate(['commune_id' => 'required|integer']);
        $communeId = $request->integer('commune_id');

        $data = Cache::remember("geo:villages:{$communeId}", self::CACHE_TTL, function () use ($communeId) {
            return DB::table('villages')
                ->where('commune_id', $communeId)
                ->select('village_id as id', 'village_code as code', 'village_name_en as name_en', 'village_name_kh as name_kh')
                ->orderBy('village_name_en')
                ->get()
                ->map(fn ($r) => (array) $r)
                ->all();
        });

        return response()->json($data);
    }
}
