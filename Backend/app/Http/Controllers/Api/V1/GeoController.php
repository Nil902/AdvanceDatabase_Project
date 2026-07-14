<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Reference data for cascading address pickers (province → district → commune → village).
// Read-only; any authenticated user may query it.
class GeoController extends Controller
{
    public function provinces()
    {
        return response()->json(
            DB::table('provinces')
                ->select('province_id as id', 'province_code as code', 'province_name_en as name_en', 'province_name_kh as name_kh')
                ->orderBy('province_name_en')
                ->get()
        );
    }

    public function districts(Request $request)
    {
        $request->validate(['province_id' => 'required|integer']);

        return response()->json(
            DB::table('districts')
                ->where('province_id', $request->integer('province_id'))
                ->select('district_id as id', 'district_code as code', 'district_name_en as name_en', 'district_name_kh as name_kh')
                ->orderBy('district_name_en')
                ->get()
        );
    }

    public function communes(Request $request)
    {
        $request->validate(['district_id' => 'required|integer']);

        return response()->json(
            DB::table('communes')
                ->where('district_id', $request->integer('district_id'))
                ->select('commune_id as id', 'commune_code as code', 'commune_name_en as name_en', 'commune_name_kh as name_kh')
                ->orderBy('commune_name_en')
                ->get()
        );
    }

    public function villages(Request $request)
    {
        $request->validate(['commune_id' => 'required|integer']);

        return response()->json(
            DB::table('villages')
                ->where('commune_id', $request->integer('commune_id'))
                ->select('village_id as id', 'village_code as code', 'village_name_en as name_en', 'village_name_kh as name_kh')
                ->orderBy('village_name_en')
                ->get()
        );
    }
}
