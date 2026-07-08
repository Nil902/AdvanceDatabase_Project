<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_profiles', function (Blueprint $table) {
            $table->id('profile_id');
            $table->unsignedBigInteger('user_id');
            $table->string('access_level', 50)->nullable();
            $table->unsignedBigInteger('province_id')->nullable();
            $table->boolean('can_manage_users')->default(false);
            $table->boolean('can_view_reports')->default(false);
            $table->boolean('can_export_data')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('user_id')->on('system_users');
            $table->foreign('province_id')->references('province_id')->on('provinces');
        });

        Schema::create('family_document_attachments', function (Blueprint $table) {
            $table->id('attachment_id');
            $table->string('reference_table', 100);
            $table->unsignedBigInteger('reference_id');
            $table->string('document_type', 100);
            $table->string('mongo_document_id', 255)->nullable();
            $table->unsignedBigInteger('uploaded_by');
            $table->timestamp('uploaded_at')->nullable();

            $table->foreign('uploaded_by')->references('user_id')->on('system_users');
        });

        Schema::create('document_attachment_images', function (Blueprint $table) {
            $table->id('image_id');
            $table->unsignedBigInteger('attachment_id');
            $table->binary('image_data');
            $table->string('mime_type', 50);
            $table->string('file_name', 255);
            $table->unsignedInteger('file_size_bytes');
            $table->unsignedInteger('page_number')->nullable();
            $table->string('checksum_sha256', 64);
            $table->unsignedBigInteger('uploaded_by');
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('attachment_id')->references('attachment_id')->on('family_document_attachments');
            $table->foreign('uploaded_by')->references('user_id')->on('system_users');
        });

        Schema::create('system_audit_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->unsignedBigInteger('staff_id');
            $table->string('action_type', 100);
            $table->timestamp('performed_at')->nullable();

            $table->foreign('staff_id')->references('staff_id')->on('staff_accounts');
        });

        Schema::create('certificate_printing_logs', function (Blueprint $table) {
            $table->id('print_id');
            $table->unsignedBigInteger('staff_id')->nullable();
            $table->string('certificate_type', 50);
            $table->unsignedBigInteger('reference_id');
            $table->string('mongo_log_id', 255)->nullable();
            $table->timestamp('printed_at')->nullable();

            $table->foreign('staff_id')->references('staff_id')->on('staff_accounts');
        });

        Schema::create('user_action_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->unsignedBigInteger('user_id');
            $table->string('session_token', 255)->nullable();
            $table->string('action', 100);
            $table->string('target_table', 100)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('performed_at')->nullable();

            $table->foreign('user_id')->references('user_id')->on('system_users');
        });

        Schema::create('system_password_reset_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('token_hash', 255);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('user_id')->references('user_id')->on('system_users');
        });

        Schema::create('relationship_verification_requests', function (Blueprint $table) {
            $table->id('request_id');
            $table->string('requester_name', 255);
            $table->unsignedBigInteger('requester_user_id');
            $table->unsignedBigInteger('target_citizen_id');
            $table->string('purpose', 255);
            $table->string('status', 50);
            $table->timestamp('created_at')->nullable();

            $table->foreign('requester_user_id')->references('user_id')->on('system_users');
            $table->foreign('target_citizen_id')->references('citizen_id')->on('citizens');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relationship_verification_requests');
        Schema::dropIfExists('system_password_reset_tokens');
        Schema::dropIfExists('user_action_logs');
        Schema::dropIfExists('certificate_printing_logs');
        Schema::dropIfExists('system_audit_logs');
        Schema::dropIfExists('document_attachment_images');
        Schema::dropIfExists('family_document_attachments');
        Schema::dropIfExists('admin_profiles');
    }
};
