<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('civil_status_lookups', function (Blueprint $table) {
            $table->id('status_id');
            $table->string('label', 100);
        });

        Schema::create('nationality_statuses', function (Blueprint $table) {
            $table->id('nationality_id');
            $table->string('label', 100);
        });

        Schema::create('relationship_types', function (Blueprint $table) {
            $table->id('rel_type_id');
            $table->string('label', 100);
        });

        Schema::create('staff_accounts', function (Blueprint $table) {
            $table->id('staff_id');
            $table->string('full_name', 255);
            $table->string('role', 100);
        });

        Schema::create('adoption_agencies', function (Blueprint $table) {
            $table->id('agency_id');
            $table->string('agency_name', 255);
            $table->string('license_number', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->boolean('is_active')->default(true);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adoption_agencies');
        Schema::dropIfExists('staff_accounts');
        Schema::dropIfExists('relationship_types');
        Schema::dropIfExists('nationality_statuses');
        Schema::dropIfExists('civil_status_lookups');
    }
};
