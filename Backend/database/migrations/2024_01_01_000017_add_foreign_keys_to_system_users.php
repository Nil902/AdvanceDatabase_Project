<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_users', function (Blueprint $table) {
            $table->foreign('officer_id')->references('officer_id')->on('registration_officers');
            $table->foreign('commune_id')->references('commune_id')->on('communes');
        });
    }

    public function down(): void
    {
        Schema::table('system_users', function (Blueprint $table) {
            $table->dropForeign(['officer_id']);
            $table->dropForeign(['commune_id']);
        });
    }
};
