<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legal_guardianships', function (Blueprint $table) {
            $table->id('guardianship_id');
            $table->unsignedBigInteger('minor_id');
            $table->unsignedBigInteger('guardian_id');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('court_order_ref', 255)->nullable();
            $table->string('status', 50);
            $table->unsignedBigInteger('granted_by');
            $table->timestamp('created_at')->nullable();

            $table->foreign('minor_id')->references('citizen_id')->on('citizens');
            $table->foreign('guardian_id')->references('citizen_id')->on('citizens');
            $table->foreign('granted_by')->references('user_id')->on('system_users');
        });

        Schema::create('guardianship_expiry_logs', function (Blueprint $table) {
            $table->id('expiry_id');
            $table->unsignedBigInteger('guardianship_id');
            $table->date('expiry_date');
            $table->timestamp('notified_at')->nullable();
            $table->string('action_taken', 255)->nullable();

            $table->foreign('guardianship_id')->references('guardianship_id')->on('legal_guardianships');
        });

        Schema::create('foster_care_placements', function (Blueprint $table) {
            $table->id('placement_id');
            $table->unsignedBigInteger('child_id');
            $table->unsignedBigInteger('foster_parent_id');
            $table->unsignedBigInteger('agency_id');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('status', 50);
            $table->timestamp('created_at')->nullable();

            $table->foreign('child_id')->references('citizen_id')->on('citizens');
            $table->foreign('foster_parent_id')->references('citizen_id')->on('citizens');
            $table->foreign('agency_id')->references('agency_id')->on('adoption_agencies');
        });

        Schema::create('adoption_orders', function (Blueprint $table) {
            $table->id('order_id');
            $table->unsignedBigInteger('child_id');
            $table->unsignedBigInteger('adoptive_parent_a');
            $table->unsignedBigInteger('adoptive_parent_b')->nullable();
            $table->unsignedBigInteger('agency_id')->nullable();
            $table->date('order_date');
            $table->string('court_reference', 255)->nullable();
            $table->date('effective_date');
            $table->unsignedBigInteger('issued_by');
            $table->timestamp('created_at')->nullable();

            $table->foreign('child_id')->references('citizen_id')->on('citizens');
            $table->foreign('adoptive_parent_a')->references('citizen_id')->on('citizens');
            $table->foreign('adoptive_parent_b')->references('citizen_id')->on('citizens');
            $table->foreign('agency_id')->references('agency_id')->on('adoption_agencies');
            $table->foreign('issued_by')->references('user_id')->on('system_users');
        });

        Schema::create('paternity_dispute_records', function (Blueprint $table) {
            $table->id('dispute_id');
            $table->unsignedBigInteger('child_id');
            $table->unsignedBigInteger('claimant_id');
            $table->string('dna_result', 100)->nullable();
            $table->date('dna_test_date')->nullable();
            $table->string('court_reference', 255)->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('child_id')->references('citizen_id')->on('citizens');
            $table->foreign('claimant_id')->references('citizen_id')->on('citizens');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paternity_dispute_records');
        Schema::dropIfExists('adoption_orders');
        Schema::dropIfExists('foster_care_placements');
        Schema::dropIfExists('guardianship_expiry_logs');
        Schema::dropIfExists('legal_guardianships');
    }
};
