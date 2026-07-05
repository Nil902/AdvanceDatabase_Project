<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_users', function (Blueprint $table) {
            $table->id('user_id');
            $table->string('username', 100)->unique();
            $table->string('email', 255)->unique()->nullable();
            $table->string('password_hash', 255);
            $table->string('full_name_kh', 255)->nullable();
            $table->string('full_name_en', 255)->nullable();
            $table->foreignId('role_id')->constrained('user_roles', 'role_id');
            $table->unsignedBigInteger('officer_id')->nullable();
            $table->unsignedBigInteger('commune_id')->nullable();
            $table->string('phone_number', 30)->nullable();
            $table->string('avatar_url', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->timestamp('password_changed_at')->nullable();
            $table->boolean('must_change_password')->default(false);
            $table->unsignedInteger('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_users');
    }
};
