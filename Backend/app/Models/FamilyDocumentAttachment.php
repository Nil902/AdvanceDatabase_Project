<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilyDocumentAttachment extends Model
{
    protected $primaryKey = 'attachment_id';
    public $timestamps = false; // uses uploaded_at instead

    protected $fillable = [
        'reference_table', 'reference_id', 'document_type',
        'mongo_document_id', 'uploaded_by', 'uploaded_at',
    ];

    protected $casts = ['uploaded_at' => 'datetime'];

    public function uploadedBy()
    {
        return $this->belongsTo(SystemUser::class, 'uploaded_by', 'user_id');
    }

    public function images()
    {
        return $this->hasMany(DocumentAttachmentImage::class, 'attachment_id', 'attachment_id');
    }

    // Convenience accessor to pull OCR text / tags / expiry metadata from Mongo
    public function mongoMetadata()
    {
        return \App\Models\Mongo\DocumentAttachment::where('pg_attachment_id', $this->attachment_id)->first();
    }

    // Polymorphic-style helper since reference_table/reference_id point at
    // different tables (marriage_certificates, adoption_orders, divorce_certificates...)
    public function reference()
    {
        $map = [
            'marriage_certificates' => MarriageCertificate::class,
            'adoption_orders' => AdoptionOrder::class,
            'divorce_certificates' => DivorceCertificate::class,
        ];

        $modelClass = $map[$this->reference_table] ?? null;

        return $modelClass ? $modelClass::find($this->reference_id) : null;
    }
}
