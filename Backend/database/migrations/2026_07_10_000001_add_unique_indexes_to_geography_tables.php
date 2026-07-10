<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provinces', function (Blueprint $table) {
            $table->unique('province_code');
        });

        Schema::table('districts', function (Blueprint $table) {
            $table->unique('district_code');
        });

        Schema::table('communes', function (Blueprint $table) {
            $table->unique('commune_code');
        });

        Schema::table('villages', function (Blueprint $table) {
            $table->unique('village_code');
        });
    }

    public function down(): void
    {
        Schema::table('provinces', function (Blueprint $table) {
            $table->dropUnique(['province_code']);
        });

        Schema::table('districts', function (Blueprint $table) {
            $table->dropUnique(['district_code']);
        });

        Schema::table('communes', function (Blueprint $table) {
            $table->dropUnique(['commune_code']);
        });

        Schema::table('villages', function (Blueprint $table) {
            $table->dropUnique(['village_code']);
        });
    }
};
