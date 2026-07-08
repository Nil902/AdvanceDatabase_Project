<?php

namespace App\Http\Requests\BirthCertificate;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBirthCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('birth:update');
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'citizen_id' => 'sometimes|integer|exists:citizens,citizen_id|unique:birth_certificates,citizen_id,'.$id.',certificate_id',
            'mother_citizen_id' => 'nullable|integer|exists:citizens,citizen_id',
            'father_citizen_id' => 'nullable|integer|exists:citizens,citizen_id',
            'certificate_number' => 'sometimes|string|max:100|unique:birth_certificates,certificate_number,'.$id.',certificate_id',
            'issue_date' => 'nullable|date',
            'issued_by_officer_id' => 'nullable|integer|exists:registration_officers,officer_id',
            'registered_date' => 'nullable|date',
            'status' => 'sometimes|in:issued,reprinted,cancelled',
            'remarks' => 'nullable|string',
        ];
    }
}
