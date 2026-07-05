<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_roles', function (Blueprint $table) {
            $table->id('role_id');
            $table->string('role_code', 50)->unique();
            $table->string('role_name_kh', 100)->nullable();
            $table->string('role_name_en', 100)->nullable();
            $table->string('description')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_roles');
    }
};
