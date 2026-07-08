<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marriage_certificates', function (Blueprint $table) {
            $table->id('certificate_id');
            $table->unsignedBigInteger('spouse_a_id');
            $table->unsignedBigInteger('spouse_b_id');
            $table->date('marriage_date');
            $table->unsignedBigInteger('issued_by');
            $table->string('certificate_number', 100)->unique();
            $table->string('location', 255)->nullable();
            $table->string('status', 50)->default('active');
            $table->timestamp('created_at')->nullable();

            $table->foreign('spouse_a_id')->references('citizen_id')->on('citizens');
            $table->foreign('spouse_b_id')->references('citizen_id')->on('citizens');
            $table->foreign('issued_by')->references('user_id')->on('system_users');
        });

        Schema::create('marriage_witnesses', function (Blueprint $table) {
            $table->id('witness_id');
            $table->unsignedBigInteger('certificate_id');
            $table->string('witness_name', 255);
            $table->string('national_id', 50)->nullable();
            $table->string('phone_number', 30)->nullable();

            $table->foreign('certificate_id')->references('certificate_id')->on('marriage_certificates');
        });

        Schema::create('marriage_asset_declarations', function (Blueprint $table) {
            $table->id('asset_id');
            $table->unsignedBigInteger('certificate_id');
            $table->text('details');
            $table->timestamp('declared_at')->nullable();

            $table->foreign('certificate_id')->references('certificate_id')->on('marriage_certificates');
        });

        Schema::create('marriage_certificate_images', function (Blueprint $table) {
            $table->id('image_id');
            $table->unsignedBigInteger('certificate_id');
            $table->binary('image_data');
            $table->string('mime_type', 50);
            $table->string('file_name', 255);
            $table->unsignedInteger('file_size_bytes');
            $table->string('checksum_sha256', 64);
            $table->unsignedBigInteger('uploaded_by');
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('certificate_id')->references('certificate_id')->on('marriage_certificates');
            $table->foreign('uploaded_by')->references('user_id')->on('system_users');
        });

        Schema::create('marriage_applications', function (Blueprint $table) {
            $table->id('application_id');
            $table->unsignedBigInteger('applicant_a');
            $table->unsignedBigInteger('applicant_b');
            $table->string('status', 50);
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable();

            $table->foreign('applicant_a')->references('citizen_id')->on('citizens');
            $table->foreign('applicant_b')->references('citizen_id')->on('citizens');
            $table->foreign('reviewed_by')->references('user_id')->on('system_users');
        });

        Schema::create('marriage_status_histories', function (Blueprint $table) {
            $table->id('status_history_id');
            $table->unsignedBigInteger('marriage_cert_id');
            $table->string('status', 50);
            $table->timestamp('changed_at')->nullable();
            $table->unsignedBigInteger('changed_by');
            $table->text('reason')->nullable();

            $table->foreign('marriage_cert_id')->references('certificate_id')->on('marriage_certificates');
            $table->foreign('changed_by')->references('user_id')->on('system_users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marriage_status_histories');
        Schema::dropIfExists('marriage_applications');
        Schema::dropIfExists('marriage_certificate_images');
        Schema::dropIfExists('marriage_asset_declarations');
        Schema::dropIfExists('marriage_witnesses');
        Schema::dropIfExists('marriage_certificates');
    }
};
