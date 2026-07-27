<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4.4 — the informant / declarant who legally makes the birth declaration
 * (distinct from the registrar who records it). One per certificate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('birth_informants', function (Blueprint $table) {
            $table->id('informant_id');
            $table->unsignedBigInteger('certificate_id');
            $table->string('full_name', 255);
            $table->string('national_id_number', 50)->nullable();
            $table->string('relationship_to_child', 100);
            $table->string('address', 500)->nullable();
            $table->string('phone_number', 30)->nullable();
            $table->date('declaration_date');
            $table->timestamp('created_at')->nullable();

            $table->foreign('certificate_id')->references('certificate_id')->on('birth_certificates')->cascadeOnDelete();
            $table->index('certificate_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('birth_informants');
    }
};
