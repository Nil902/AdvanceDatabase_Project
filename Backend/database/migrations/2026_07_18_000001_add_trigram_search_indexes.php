<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Trigram (pg_trgm) GIN indexes for the substring searches the app runs.
 *
 * The citizen / family search endpoints use `ILIKE '%term%'` (leading wildcard),
 * which a normal B-tree index cannot serve — so on 100k+ citizens Postgres does
 * a full sequential scan (~200 ms/search, worse under load). A GIN index with
 * `gin_trgm_ops` makes these substring matches index-backed (bitmap scans),
 * cutting search latency by an order of magnitude.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // Citizen search: full_name_en / full_name_kh / national_id_number
        DB::statement('CREATE INDEX IF NOT EXISTS citizens_full_name_en_trgm ON citizens USING gin (full_name_en gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS citizens_full_name_kh_trgm ON citizens USING gin (full_name_kh gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS citizens_national_id_trgm ON citizens USING gin (national_id_number gin_trgm_ops)');

        // Family search: family_code
        DB::statement('CREATE INDEX IF NOT EXISTS family_units_family_code_trgm ON family_units USING gin (family_code gin_trgm_ops)');

        // Household / ID-card lookups by human-entered serial/number
        DB::statement('CREATE INDEX IF NOT EXISTS households_household_number_trgm ON households USING gin (household_number gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS identity_cards_serial_trgm ON identity_cards USING gin (card_serial_number gin_trgm_ops)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS citizens_full_name_en_trgm');
        DB::statement('DROP INDEX IF EXISTS citizens_full_name_kh_trgm');
        DB::statement('DROP INDEX IF EXISTS citizens_national_id_trgm');
        DB::statement('DROP INDEX IF EXISTS family_units_family_code_trgm');
        DB::statement('DROP INDEX IF EXISTS households_household_number_trgm');
        DB::statement('DROP INDEX IF EXISTS identity_cards_serial_trgm');
    }
};
