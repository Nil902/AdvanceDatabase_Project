<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_units', function (Blueprint $table) {
            $table->id('family_unit_id');
            $table->string('family_code', 50)->unique();
            $table->unsignedBigInteger('head_citizen_id');
            $table->timestamp('created_at')->nullable();

            $table->foreign('head_citizen_id')->references('citizen_id')->on('citizens');
        });

        Schema::create('citizen_relationships', function (Blueprint $table) {
            $table->id('rel_id');
            $table->unsignedBigInteger('citizen_id_a');
            $table->unsignedBigInteger('citizen_id_b');
            $table->unsignedBigInteger('rel_type_id');
            $table->boolean('verified')->default(false);
            $table->timestamp('created_at')->nullable();

            $table->foreign('citizen_id_a')->references('citizen_id')->on('citizens');
            $table->foreign('citizen_id_b')->references('citizen_id')->on('citizens');
            $table->foreign('rel_type_id')->references('rel_type_id')->on('relationship_types');
        });

        Schema::create('dependency_registry', function (Blueprint $table) {
            $table->id('dependency_id');
            $table->unsignedBigInteger('head_id');
            $table->unsignedBigInteger('dependent_id');
            $table->string('dependency_type', 100);
            $table->date('start_date');
            $table->date('end_date')->nullable();

            $table->foreign('head_id')->references('citizen_id')->on('citizens');
            $table->foreign('dependent_id')->references('citizen_id')->on('citizens');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dependency_registry');
        Schema::dropIfExists('citizen_relationships');
        Schema::dropIfExists('family_units');
    }
};
