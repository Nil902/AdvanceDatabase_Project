<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('identity_cards', function (Blueprint $table) {
            $table->id('card_id');
            $table->unsignedBigInteger('citizen_id');
            $table->string('card_serial_number', 50)->unique();
            $table->string('card_type', 50);
            $table->string('status', 50)->default('issued');
            $table->date('issue_date');
            $table->date('expiry_date');
            $table->unsignedBigInteger('marriage_cert_id')->nullable();
            $table->string('biometric_ref', 255)->nullable();
            $table->unsignedBigInteger('issued_by')->nullable();
            $table->unsignedBigInteger('replaces_card_id')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('marriage_cert_id')->references('certificate_id')->on('marriage_certificates');
            $table->foreign('issued_by')->references('user_id')->on('system_users');
            $table->foreign('replaces_card_id')->references('card_id')->on('identity_cards');
        });

        Schema::create('identity_card_images', function (Blueprint $table) {
            $table->id('image_id');
            $table->unsignedBigInteger('card_id');
            $table->string('image_type', 50);
            $table->binary('image_data');
            $table->string('mime_type', 50);
            $table->string('file_name', 255);
            $table->unsignedInteger('file_size_bytes');
            $table->unsignedInteger('width_px')->nullable();
            $table->unsignedInteger('height_px')->nullable();
            $table->string('checksum_sha256', 64);
            $table->unsignedBigInteger('uploaded_by');
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('card_id')->references('card_id')->on('identity_cards');
            $table->foreign('uploaded_by')->references('user_id')->on('system_users');
        });

        Schema::create('card_requests', function (Blueprint $table) {
            $table->id('request_id');
            $table->unsignedBigInteger('citizen_id');
            $table->string('request_type', 50);
            $table->string('request_status', 50);
            $table->timestamp('request_date')->nullable();
            $table->unsignedBigInteger('processed_by')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->unsignedBigInteger('result_card_id')->nullable();
            $table->text('notes')->nullable();

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens');
            $table->foreign('processed_by')->references('user_id')->on('system_users');
            $table->foreign('result_card_id')->references('card_id')->on('identity_cards');
        });

        Schema::create('card_status_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->unsignedBigInteger('card_id');
            $table->string('previous_status', 50)->nullable();
            $table->string('new_status', 50);
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('changed_by');
            $table->timestamp('changed_at')->nullable();

            $table->foreign('card_id')->references('card_id')->on('identity_cards');
            $table->foreign('changed_by')->references('user_id')->on('system_users');
        });

        Schema::create('dispatch_tracking', function (Blueprint $table) {
            $table->id('tracking_id');
            $table->unsignedBigInteger('card_id');
            $table->unsignedBigInteger('triggered_by');
            $table->timestamp('triggered_at')->nullable();
            $table->string('print_facility', 255)->nullable();
            $table->string('tracking_number', 100)->nullable();
            $table->string('distribution_point', 255)->nullable();
            $table->string('dispatch_status', 50);
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->foreign('card_id')->references('card_id')->on('identity_cards');
            $table->foreign('triggered_by')->references('user_id')->on('system_users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispatch_tracking');
        Schema::dropIfExists('card_status_logs');
        Schema::dropIfExists('card_requests');
        Schema::dropIfExists('identity_card_images');
        Schema::dropIfExists('identity_cards');
    }
};
