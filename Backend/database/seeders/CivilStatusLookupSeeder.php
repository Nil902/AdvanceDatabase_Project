<?php

namespace Database\Seeders;

use App\Models\CivilStatusLookup;
use Illuminate\Database\Seeder;

class CivilStatusLookupSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = ['single', 'married', 'divorced', 'widowed', 'deceased'];

        foreach ($statuses as $status) {
            CivilStatusLookup::firstOrCreate(['label' => $status]);
        }
    }
}
