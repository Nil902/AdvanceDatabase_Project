<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('households', function (Blueprint $table) {
            $table->id('household_id');
            $table->string('household_number', 50);
            $table->string('book_serial', 50)->nullable();
            $table->unsignedBigInteger('village_id');
            $table->unsignedBigInteger('household_head_id');
            $table->string('house_no', 50)->nullable();
            $table->string('krom_no', 50)->nullable();
            $table->string('police_station', 255)->nullable();
            $table->text('address_detail')->nullable();
            $table->date('issued_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_date')->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->foreign('village_id')->references('village_id')->on('villages');
            $table->foreign('household_head_id')->references('citizen_id')->on('citizens');
        });

        Schema::create('household_members', function (Blueprint $table) {
            $table->id('hhm_id');
            $table->unsignedBigInteger('household_id');
            $table->unsignedBigInteger('citizen_id');
            $table->string('relation_to_head', 100);
            $table->date('joined_date');
            $table->date('left_date')->nullable();

            $table->foreign('household_id')->references('household_id')->on('households');
            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
        });

        Schema::create('move_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('resident_id');
            $table->unsignedBigInteger('from_household_id')->nullable();
            $table->unsignedBigInteger('to_household_id');
            $table->date('move_date');
            $table->string('reason', 255)->nullable();
            $table->string('authorized_by', 255)->nullable();
            $table->unsignedBigInteger('recorded_by_user');
            $table->timestamp('recorded_at')->nullable();

            $table->foreign('resident_id')->references('citizen_id')->on('citizens');
            $table->foreign('from_household_id')->references('household_id')->on('households');
            $table->foreign('to_household_id')->references('household_id')->on('households');
            $table->foreign('recorded_by_user')->references('user_id')->on('system_users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('move_history');
        Schema::dropIfExists('household_members');
        Schema::dropIfExists('households');
    }
};
