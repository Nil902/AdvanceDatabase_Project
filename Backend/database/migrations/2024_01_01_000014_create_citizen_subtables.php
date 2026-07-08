<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('citizen_addresses', function (Blueprint $table) {
            $table->id('address_id');
            $table->unsignedBigInteger('citizen_id');
            $table->string('street', 255)->nullable();
            $table->string('city', 255)->nullable();
            $table->string('province', 255)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('country', 100)->nullable();
            $table->boolean('is_current')->default(true);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_to')->nullable();

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
        });

        Schema::create('citizen_biometrics', function (Blueprint $table) {
            $table->id('biometric_id');
            $table->unsignedBigInteger('citizen_id');
            $table->string('mongo_document_id', 255)->nullable();
            $table->timestamp('fingerprint_taken_date')->nullable();
            $table->unsignedBigInteger('taken_by_officer_id');
            $table->unsignedSmallInteger('quality_score')->nullable();
            $table->string('fingers_captured', 100)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('taken_by_officer_id')->references('officer_id')->on('registration_officers');
        });

        Schema::create('citizen_marital_statuses', function (Blueprint $table) {
            $table->id('status_id');
            $table->unsignedBigInteger('citizen_id');
            $table->string('status', 50);
            $table->timestamp('effective_date')->nullable();
            $table->unsignedBigInteger('recorded_by');

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('recorded_by')->references('user_id')->on('system_users');
        });

        Schema::create('civil_status_histories', function (Blueprint $table) {
            $table->id('history_id');
            $table->unsignedBigInteger('citizen_id');
            $table->unsignedBigInteger('status_id')->nullable();
            $table->date('effective_date');
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('status_id')->references('status_id')->on('civil_status_lookups');
            $table->foreign('recorded_by')->references('user_id')->on('system_users');
        });

        Schema::create('nationality_histories', function (Blueprint $table) {
            $table->id('nat_history_id');
            $table->unsignedBigInteger('citizen_id');
            $table->unsignedBigInteger('nationality_id');
            $table->date('change_date');
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('recorded_by');
            $table->timestamp('created_at')->nullable();

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('nationality_id')->references('nationality_id')->on('nationality_statuses');
            $table->foreign('recorded_by')->references('user_id')->on('system_users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nationality_histories');
        Schema::dropIfExists('civil_status_histories');
        Schema::dropIfExists('citizen_marital_statuses');
        Schema::dropIfExists('citizen_biometrics');
        Schema::dropIfExists('citizen_addresses');
    }
};
