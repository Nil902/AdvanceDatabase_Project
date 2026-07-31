<?php

namespace App\Http\Requests\Citizen;

use Illuminate\Foundation\Http\FormRequest;

class DocumentUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('citizen:upload_document');
    }

    public function rules(): array
    {
        return [
            // Any official document: scans (image) or a PDF. Capped at 8 MB
            // because the bytes are stored inline in a PostgreSQL bytea column.
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:8192',
            // Free-form label for the kind of document (e.g. "passport",
            // "marriage_certificate", "residency_proof"). Kept generic so the
            // registrar can file any official document without a code change.
            'document_type' => 'required|string|max:100',
        ];
    }
}
