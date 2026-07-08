<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('citizens', function (Blueprint $table) {
            $table->id('citizen_id');
            $table->string('national_id_number', 50)->unique()->nullable();
            $table->string('full_name_kh', 255);
            $table->string('full_name_en', 255)->nullable();
            $table->string('gender', 20);
            $table->date('date_of_birth');
            $table->date('date_of_death')->nullable();
            $table->unsignedBigInteger('birth_place_village_id')->nullable();
            $table->string('nationality', 100)->nullable();
            $table->string('occupation', 255)->nullable();
            $table->timestamps();

            $table->foreign('birth_place_village_id')->references('village_id')->on('villages');
        });

        Schema::create('parents', function (Blueprint $table) {
            $table->id('parent_id');
            $table->string('national_id_number', 50)->nullable();
            $table->string('full_name_kh', 255);
            $table->string('full_name_en', 255)->nullable();
            $table->string('gender', 20);
            $table->date('date_of_birth')->nullable();
            $table->unsignedBigInteger('birth_place_village_id')->nullable();
            $table->string('phone_number', 30)->nullable();
            $table->string('occupation', 255)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('birth_place_village_id')->references('village_id')->on('villages');
        });

        Schema::create('citizen_parents', function (Blueprint $table) {
            $table->id('citizen_parent_id');
            $table->unsignedBigInteger('citizen_id');
            $table->unsignedBigInteger('parent_id');
            $table->string('relationship_type', 50);

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('parent_id')->references('parent_id')->on('parents');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('citizen_parents');
        Schema::dropIfExists('parents');
        Schema::dropIfExists('citizens');
    }
};
