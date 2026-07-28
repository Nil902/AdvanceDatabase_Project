<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive: give citizens a stored portrait so lists can show a profile icon.
// The file lives on the 'public' disk; it is streamed back through an
// auth-guarded endpoint (never a public URL), since a face photo is PII.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('citizens', function (Blueprint $table) {
            $table->string('photo_path', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('citizens', function (Blueprint $table) {
            $table->dropColumn('photo_path');
        });
    }
};
