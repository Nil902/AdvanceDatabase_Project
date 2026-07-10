<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GeographySeeder extends Seeder
{
    public function run(): void
    {
        $basePath = base_path('../jsonData');

        $this->command->info('Seeding provinces...');
        $provinces = json_decode(file_get_contents("$basePath/provinces.json"), true);
        foreach ($provinces as $province) {
            DB::table('provinces')->insertOrIgnore([
                'province_code' => $province['code'],
                'province_name_kh' => $province['name_km'],
                'province_name_en' => $province['name_en'],
                'created_at' => now(),
            ]);
        }

        $this->command->info('Seeding districts...');
        $districtsByProvince = json_decode(file_get_contents("$basePath/districts-by-province.json"), true);
        foreach ($districtsByProvince as $provinceCode => $districts) {
            $provinceId = DB::table('provinces')
                ->where('province_code', $provinceCode)
                ->value('province_id');

            if (!$provinceId) continue;

            foreach ($districts as $district) {
                DB::table('districts')->insertOrIgnore([
                    'district_code' => $district['code'],
                    'district_name_kh' => $district['name_km'],
                    'district_name_en' => $district['name_en'],
                    'province_id' => $provinceId,
                    'created_at' => now(),
                ]);
            }
        }

        $this->command->info('Seeding communes...');
        $communesByDistrict = json_decode(file_get_contents("$basePath/communes-by-district.json"), true);
        foreach ($communesByDistrict as $districtCode => $communes) {
            $districtId = DB::table('districts')
                ->where('district_code', $districtCode)
                ->value('district_id');

            if (!$districtId) continue;

            foreach ($communes as $commune) {
                DB::table('communes')->insertOrIgnore([
                    'commune_code' => $commune['code'],
                    'commune_name_kh' => $commune['name_km'],
                    'commune_name_en' => $commune['name_en'],
                    'district_id' => $districtId,
                    'created_at' => now(),
                ]);
            }
        }

        $this->command->info('Seeding villages...');
        $villagesByCommune = json_decode(file_get_contents("$basePath/villages-by-commune.json"), true);

        $communeCodeToId = DB::table('communes')
            ->pluck('commune_id', 'commune_code')
            ->toArray();

        $batch = [];
        $batchSize = 500;

        foreach ($villagesByCommune as $communeCode => $villages) {
            $communeId = $communeCodeToId[$communeCode] ?? null;
            if (!$communeId) continue;

            foreach ($villages as $village) {
                $batch[] = [
                    'village_code' => $village['code'],
                    'village_name_kh' => $village['name_km'],
                    'village_name_en' => $village['name_en'],
                    'commune_id' => $communeId,
                    'created_at' => now(),
                ];

                if (count($batch) >= $batchSize) {
                    DB::table('villages')->insertOrIgnore($batch);
                    $batch = [];
                }
            }
        }

        if (!empty($batch)) {
            DB::table('villages')->insertOrIgnore($batch);
        }

        $this->command->info('Geography seeding complete!');
    }
}
