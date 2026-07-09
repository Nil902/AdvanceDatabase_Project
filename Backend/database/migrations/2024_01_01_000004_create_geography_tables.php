<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provinces', function (Blueprint $table) {
            $table->id('province_id');
            $table->string('province_code', 10);
            $table->string('province_name_kh', 255)->nullable();
            $table->string('province_name_en', 255)->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('districts', function (Blueprint $table) {
            $table->id('district_id');
            $table->string('district_code', 10);
            $table->string('district_name_kh', 255)->nullable();
            $table->string('district_name_en', 255)->nullable();
            $table->foreignId('province_id')->constrained('provinces', 'province_id');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('communes', function (Blueprint $table) {
            $table->id('commune_id');
            $table->string('commune_code', 10);
            $table->string('commune_name_kh', 255)->nullable();
            $table->string('commune_name_en', 255)->nullable();
            $table->foreignId('district_id')->constrained('districts', 'district_id');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('villages', function (Blueprint $table) {
            $table->id('village_id');
            $table->string('village_code', 10);
            $table->string('village_name_kh', 255)->nullable();
            $table->string('village_name_en', 255)->nullable();
            $table->foreignId('commune_id')->constrained('communes', 'commune_id');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('villages');
        Schema::dropIfExists('communes');
        Schema::dropIfExists('districts');
        Schema::dropIfExists('provinces');
    }
};
