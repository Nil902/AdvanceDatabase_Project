<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('divorce_certificates', function (Blueprint $table) {
            $table->id('divorce_id');
            $table->unsignedBigInteger('marriage_cert_id');
            $table->date('ruling_date');
            $table->string('court_reference', 255)->nullable();
            $table->unsignedBigInteger('issued_by');
            $table->timestamp('created_at')->nullable();

            $table->foreign('marriage_cert_id')->references('certificate_id')->on('marriage_certificates');
            $table->foreign('issued_by')->references('user_id')->on('system_users');
        });

        Schema::create('divorce_settlements', function (Blueprint $table) {
            $table->id('settlement_id');
            $table->unsignedBigInteger('divorce_id');
            $table->text('terms');
            $table->text('child_custody')->nullable();
            $table->text('asset_division')->nullable();
            $table->timestamp('recorded_at')->nullable();

            $table->foreign('divorce_id')->references('divorce_id')->on('divorce_certificates');
        });

        Schema::create('annulment_records', function (Blueprint $table) {
            $table->id('annulment_id');
            $table->unsignedBigInteger('marriage_cert_id');
            $table->text('reason')->nullable();
            $table->string('court_reference', 255)->nullable();
            $table->date('annulled_date');
            $table->unsignedBigInteger('issued_by');
            $table->timestamp('created_at')->nullable();

            $table->foreign('marriage_cert_id')->references('certificate_id')->on('marriage_certificates');
            $table->foreign('issued_by')->references('user_id')->on('system_users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('annulment_records');
        Schema::dropIfExists('divorce_settlements');
        Schema::dropIfExists('divorce_certificates');
    }
};
