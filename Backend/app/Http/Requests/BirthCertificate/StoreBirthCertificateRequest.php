<?php

namespace App\Http\Requests\BirthCertificate;

use Illuminate\Foundation\Http\FormRequest;

class StoreBirthCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('birth:create');
    }

    public function rules(): array
    {
        return [
            'citizen_id' => 'required|integer|exists:citizens,citizen_id|unique:birth_certificates,citizen_id',
            'certificate_number' => 'required|string|max:100|unique:birth_certificates,certificate_number',
            'issue_date' => 'nullable|date',
            'issued_by_officer_id' => 'nullable|integer|exists:registration_officers,officer_id',
            'registered_date' => 'nullable|date',
            'remarks' => 'nullable|string|max:2000',

            // Each parent is EITHER a linked citizen ({ citizen_id }) OR manually
            // entered details. Mother is required; father is optional (may be
            // unknown). Manual entry requires at least name + gender.
            'mother' => 'required|array',
            'mother.citizen_id' => 'nullable|integer|exists:citizens,citizen_id',
            'mother.full_name_kh' => 'required_without:mother.citizen_id|nullable|string|max:255',
            'mother.full_name_en' => 'nullable|string|max:255',
            'mother.gender' => 'required_without:mother.citizen_id|nullable|string|in:M,F',
            'mother.nationality' => 'nullable|string|max:100',
            'mother.date_of_birth' => 'nullable|date',
            'mother.national_id_number' => 'nullable|string|max:50',
            'mother.occupation' => 'nullable|string|max:255',

            'father' => 'nullable|array',
            'father.citizen_id' => 'nullable|integer|exists:citizens,citizen_id',
            'father.full_name_kh' => 'nullable|string|max:255',
            'father.full_name_en' => 'nullable|string|max:255',
            'father.gender' => 'required_with:father.full_name_kh|nullable|string|in:M,F',
            'father.nationality' => 'nullable|string|max:100',
            'father.date_of_birth' => 'nullable|date',
            'father.national_id_number' => 'nullable|string|max:50',
            'father.occupation' => 'nullable|string|max:255',
        ];
    }
}
