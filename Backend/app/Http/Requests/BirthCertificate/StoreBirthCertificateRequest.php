<?php

namespace App\Http\Requests\BirthCertificate;

use Illuminate\Foundation\Http\FormRequest;

class StoreBirthCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('birth:create');
    }

    protected function prepareForValidation(): void
    {
        // Default the timeliness so the justification rule below is unambiguous.
        if (! $this->filled('registration_type')) {
            $this->merge(['registration_type' => 'on_time']);
        }
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

            // ── Phase 4.3 certificate detail ──────────────────────────────
            'time_of_birth' => 'nullable|date_format:H:i',
            'birth_place_type' => 'nullable|in:hospital,health_centre,home,in_transit,other',
            'birth_facility_name' => 'nullable|string|max:255',
            'attendant_type' => 'nullable|in:doctor,midwife,traditional,none',
            'attendant_name' => 'nullable|string|max:255',
            'attendant_license_no' => 'nullable|string|max:100',
            'birth_weight_grams' => 'nullable|integer|min:200|max:10000',
            'gestational_age_weeks' => 'nullable|integer|min:20|max:45',
            'multiple_birth_type' => 'nullable|in:singleton,twin,triplet_plus',
            'birth_order' => 'nullable|integer|min:1|max:10',
            'is_live_birth' => 'nullable|boolean',
            'parents_marital_status' => 'nullable|in:married,unmarried,divorced,widowed',
            'marriage_cert_reference' => 'nullable|string|max:100',

            // Timeliness: a justification is required when it isn't on-time.
            'registration_type' => 'required|in:on_time,late,delayed',
            'registration_justification' => 'required_unless:registration_type,on_time|nullable|string|max:1000',

            'registry_book_volume' => 'nullable|string|max:50',
            'registry_book_page' => 'nullable|string|max:50',
            'registry_book_entry' => 'nullable|string|max:50',

            // ── Informant / declarant (Phase 4.4, legally required) ───────
            'informant' => 'required|array',
            'informant.full_name' => 'required|string|max:255',
            'informant.national_id_number' => 'nullable|string|max:50',
            'informant.relationship_to_child' => 'required|string|max:100',
            'informant.address' => 'nullable|string|max:500',
            'informant.phone_number' => 'nullable|string|max:30',
            'informant.declaration_date' => 'required|date',
        ];
    }
}
