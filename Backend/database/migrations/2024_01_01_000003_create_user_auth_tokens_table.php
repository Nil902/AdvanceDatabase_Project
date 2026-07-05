<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_auth_tokens', function (Blueprint $table) {
            $table->id('token_id');
            $table->foreignId('user_id')->constrained('system_users', 'user_id')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('token_name', 100);
            $table->json('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_auth_tokens');
    }
};
