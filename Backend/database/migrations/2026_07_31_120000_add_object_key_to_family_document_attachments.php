<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Documents are stored inline in PostgreSQL (document_attachment_images) AND
// mirrored to object storage (R2) so they appear in the bucket alongside photos.
// These columns hold the R2 pointer; nullable because the R2 write is
// best-effort — a document with a NULL object_key still exists safely in PG.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_document_attachments', function (Blueprint $table) {
            $table->string('object_key', 512)->nullable()->after('mongo_document_id');
            $table->string('storage_disk', 50)->nullable()->after('object_key');
        });
    }

    public function down(): void
    {
        Schema::table('family_document_attachments', function (Blueprint $table) {
            $table->dropColumn(['object_key', 'storage_disk']);
        });
    }
};
