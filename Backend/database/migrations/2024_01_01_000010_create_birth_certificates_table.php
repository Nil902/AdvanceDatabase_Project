<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('birth_certificates', function (Blueprint $table) {
            $table->id('certificate_id');
            $table->unsignedBigInteger('citizen_id');
            $table->unsignedBigInteger('mother_citizen_id')->nullable();
            $table->unsignedBigInteger('father_citizen_id')->nullable();
            $table->string('certificate_number', 100)->unique();
            $table->timestamp('issue_date')->nullable();
            $table->unsignedBigInteger('issued_by_officer_id')->nullable();
            $table->timestamp('registered_date')->nullable();
            $table->string('status', 50)->default('issued');
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('mother_citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('father_citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('issued_by_officer_id')->references('officer_id')->on('registration_officers');
        });

        Schema::create('birth_certificate_images', function (Blueprint $table) {
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

            $table->foreign('certificate_id')->references('certificate_id')->on('birth_certificates');
            $table->foreign('uploaded_by')->references('user_id')->on('system_users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('birth_certificate_images');
        Schema::dropIfExists('birth_certificates');
    }
};
