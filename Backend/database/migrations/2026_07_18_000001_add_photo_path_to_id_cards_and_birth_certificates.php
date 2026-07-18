<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Stores the registrar-uploaded photo/scan attached at issue time. The file
// itself lives on the `public` disk (persisted app-storage volume); this column
// holds its relative path. Streamed back through the API, not served statically.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('identity_cards', function (Blueprint $table) {
            $table->string('photo_path', 255)->nullable();
        });

        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->string('photo_path', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('identity_cards', function (Blueprint $table) {
            $table->dropColumn('photo_path');
        });

        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->dropColumn('photo_path');
        });
    }
};
