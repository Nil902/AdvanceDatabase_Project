<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4.2 — make `parents` the canonical parent representation.
 *
 * A parent record MAY reference a registered citizen (parents.citizen_id) or hold
 * manually-entered details (foreign/deceased/unregistered parents). Birth
 * certificates reference parents via mother_parent_id / father_parent_id.
 *
 * This migration is ADDITIVE only (all new columns nullable). The existing
 * mother_citizen_id / father_citizen_id columns are left in place and are dropped
 * in a later migration once the backfill (birth-certs:backfill-parents) has run.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parents', function (Blueprint $table) {
            $table->unsignedBigInteger('citizen_id')->nullable()->after('parent_id');
            $table->string('nationality', 100)->nullable()->after('gender');

            $table->foreign('citizen_id')->references('citizen_id')->on('citizens')->nullOnDelete();
        });

        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->unsignedBigInteger('mother_parent_id')->nullable()->after('father_citizen_id');
            $table->unsignedBigInteger('father_parent_id')->nullable()->after('mother_parent_id');

            $table->foreign('mother_parent_id')->references('parent_id')->on('parents')->nullOnDelete();
            $table->foreign('father_parent_id')->references('parent_id')->on('parents')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('birth_certificates', function (Blueprint $table) {
            $table->dropForeign(['mother_parent_id']);
            $table->dropForeign(['father_parent_id']);
            $table->dropColumn(['mother_parent_id', 'father_parent_id']);
        });

        Schema::table('parents', function (Blueprint $table) {
            $table->dropForeign(['citizen_id']);
            $table->dropColumn(['citizen_id', 'nationality']);
        });
    }
};
