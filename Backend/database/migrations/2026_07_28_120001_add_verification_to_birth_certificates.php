<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('birth_certificates', function (Blueprint $table) {
            // Verification workflow (Phase 6): who confirmed the record and when.
            // Null = not yet verified. A later amendment clears these so the
            // corrected record must be re-verified.
            $table->timestamp('verified_at')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();
            // The stated reason for the most recent amendment to a verified record.
            $table->string('last_amendment_reason', 500)->nullable();

            $table->foreign('verified_by')->references('user_id')->on('system_users');
        });
    }

    public function down(): void
    {
        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
            $table->dropColumn(['verified_at', 'verified_by', 'last_amendment_reason']);
        });
    }
};
