<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4.3 — the certificate detail fields a real Cambodian birth record
 * carries. All additive and nullable (existing rows keep working).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->time('time_of_birth')->nullable()->after('registered_date');

            // Where the birth happened.
            $table->string('birth_place_type', 30)->nullable();   // hospital|health_centre|home|in_transit|other
            $table->string('birth_facility_name', 255)->nullable();

            // Who attended.
            $table->string('attendant_type', 30)->nullable();     // doctor|midwife|traditional|none
            $table->string('attendant_name', 255)->nullable();
            $table->string('attendant_license_no', 100)->nullable();

            // Clinical detail.
            $table->unsignedInteger('birth_weight_grams')->nullable();
            $table->unsignedSmallInteger('gestational_age_weeks')->nullable();
            $table->string('multiple_birth_type', 20)->nullable(); // singleton|twin|triplet_plus
            $table->unsignedSmallInteger('birth_order')->nullable();
            $table->boolean('is_live_birth')->default(true);

            // Parents' status at the time of birth.
            $table->string('parents_marital_status', 30)->nullable(); // married|unmarried|divorced|widowed
            $table->string('marriage_cert_reference', 100)->nullable();

            // Registration timeliness — on_time (≤30d), late, or delayed (legally distinct).
            $table->string('registration_type', 20)->nullable()->default('on_time');
            $table->text('registration_justification')->nullable();

            // Paper registry book cross-reference (legally required).
            $table->string('registry_book_volume', 50)->nullable();
            $table->string('registry_book_page', 50)->nullable();
            $table->string('registry_book_entry', 50)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->dropColumn([
                'time_of_birth', 'birth_place_type', 'birth_facility_name',
                'attendant_type', 'attendant_name', 'attendant_license_no',
                'birth_weight_grams', 'gestational_age_weeks', 'multiple_birth_type',
                'birth_order', 'is_live_birth', 'parents_marital_status',
                'marriage_cert_reference', 'registration_type', 'registration_justification',
                'registry_book_volume', 'registry_book_page', 'registry_book_entry',
            ]);
        });
    }
};
