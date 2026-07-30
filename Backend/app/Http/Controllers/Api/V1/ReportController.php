<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    // Tags the summary shares with the write paths. When a citizen / birth cert /
    // id card / household / vital event is created or updated, those services
    // call Cache::tags(['<tag>'])->flush(), which — because this key carries the
    // same tags — invalidates the summary too. So app-created data shows up
    // immediately instead of waiting out the 1h TTL. (Bulk `data:generate` writes
    // straight to Postgres and bypasses these services, so use the dashboard's
    // Clear Cache button after a bulk load.)
    private const SUMMARY_TAGS = ['reports', 'citizens', 'birth_certificates', 'id_cards', 'households', 'vital_events'];

    public function summary()
    {
        $summary = Cache::tags(self::SUMMARY_TAGS)->remember('reports_summary', 3600, function () {
            return [
                'total_citizens' => DB::table('citizens')->count(),
                'total_birth_certificates' => DB::table('birth_certificates')->count(),
                'total_marriages' => DB::table('marriage_certificates')->where('status', 'active')->count(),
                'total_households' => DB::table('households')->where('is_active', true)->count(),
                'total_active_id_cards' => DB::table('identity_cards')->where('status', 'active')->count(),
            ];
        });

        return response()->json($summary);
    }

    public function demographics(Request $request)
    {
        $request->validate([
            'group_by' => 'nullable|in:gender,age_group,province',
        ]);

        $groupBy = $request->get('group_by', 'gender');
        $cacheKey = 'reports_demographics_'.$groupBy;

        // Demographics only breaks down citizens, so it invalidates whenever the
        // citizens tag is flushed (CitizenService / VitalEventService create).
        $demographics = Cache::tags(['reports', 'citizens'])->remember($cacheKey, 3600, function () use ($groupBy) {
            $query = DB::table('citizens')
                ->join('villages', 'citizens.birth_place_village_id', '=', 'villages.village_id')
                ->join('communes', 'villages.commune_id', '=', 'communes.commune_id')
                ->join('districts', 'communes.district_id', '=', 'districts.district_id')
                ->join('provinces', 'districts.province_id', '=', 'provinces.province_id');

            $rows = match ($groupBy) {
                'gender' => $query->select('gender', DB::raw('count(*) as total'))
                    ->groupBy('gender')
                    ->get(),
                'age_group' => $query->select(
                    DB::raw("
                        CASE
                            WHEN date_of_birth > now() - interval '18 years' THEN '0-17'
                            WHEN date_of_birth > now() - interval '35 years' THEN '18-34'
                            WHEN date_of_birth > now() - interval '60 years' THEN '35-59'
                            ELSE '60+'
                        END as age_group"),
                    DB::raw('count(*) as total')
                )
                    ->groupBy('age_group')
                    ->get(),
                'province' => $query->select('provinces.province_name_en', DB::raw('count(*) as total'))
                    ->groupBy('provinces.province_name_en')
                    ->get(),
            };

            // Cache plain arrays, not a Collection of stdClass — serialising the
            // Collection into Redis and reading it back yields a broken
            // __PHP_Incomplete_Class in the JSON response.
            return $rows->map(fn ($row) => (array) $row)->all();
        });

        return response()->json($demographics);
    }

    public function export(Request $request)
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="report.csv"',
        ];

        $callback = function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Name', 'Date of Birth', 'Gender']);

            DB::table('citizens')->chunk(1000, function ($citizens) use ($handle) {
                foreach ($citizens as $citizen) {
                    fputcsv($handle, [
                        $citizen->citizen_id,
                        $citizen->full_name_kh,
                        $citizen->date_of_birth,
                        $citizen->gender,
                    ]);
                }
            });

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
