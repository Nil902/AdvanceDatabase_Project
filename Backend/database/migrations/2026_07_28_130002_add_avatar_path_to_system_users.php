<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive: let an operator upload their own profile picture. Stored on the
// 'public' disk and streamed back through an auth-guarded endpoint. Kept
// separate from the pre-existing avatar_url (a free-form URL) so neither
// clobbers the other.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_users', function (Blueprint $table) {
            $table->string('avatar_path', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('system_users', function (Blueprint $table) {
            $table->dropColumn('avatar_path');
        });
    }
};
