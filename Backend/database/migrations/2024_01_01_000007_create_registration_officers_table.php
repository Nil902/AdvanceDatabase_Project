<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_officers', function (Blueprint $table) {
            $table->id('officer_id');
            $table->string('officer_code', 50);
            $table->string('full_name_kh', 255);
            $table->string('full_name_en', 255)->nullable();
            $table->string('position', 100);
            $table->string('phone_number', 30)->nullable();
            $table->unsignedBigInteger('active_stamp_id')->nullable();
            $table->unsignedBigInteger('commune_id');
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->nullable();

            $table->foreign('commune_id')->references('commune_id')->on('communes');
        });

        Schema::create('officer_stamp_images', function (Blueprint $table) {
            $table->id('stamp_id');
            $table->unsignedBigInteger('officer_id');
            $table->binary('image_data');
            $table->string('mime_type', 50);
            $table->unsignedInteger('width_px')->nullable();
            $table->unsignedInteger('height_px')->nullable();
            $table->unsignedInteger('file_size_bytes');
            $table->string('checksum_sha256', 64);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('uploaded_by');
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamp('replaced_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('officer_id')->references('officer_id')->on('registration_officers');
            $table->foreign('uploaded_by')->references('user_id')->on('system_users');
        });

        Schema::table('registration_officers', function (Blueprint $table) {
            $table->foreign('active_stamp_id')->references('stamp_id')->on('officer_stamp_images');
        });
    }

    public function down(): void
    {
        Schema::table('registration_officers', function (Blueprint $table) {
            $table->dropForeign(['active_stamp_id']);
        });
        Schema::dropIfExists('officer_stamp_images');
        Schema::dropIfExists('registration_officers');
    }
};
