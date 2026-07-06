<?php

namespace App\Http\Requests\VitalEvent;

use Illuminate\Foundation\Http\FormRequest;

class BirthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('vital:birth');
    }

    public function rules(): array
    {
        return [
            'citizen_id'           => 'required|integer|exists:citizens,citizen_id|unique:birth_certificates,citizen_id',
            'mother_citizen_id'    => 'nullable|integer|exists:citizens,citizen_id',
            'father_citizen_id'    => 'nullable|integer|exists:citizens,citizen_id',
            'certificate_number'   => 'nullable|string|max:100|unique:birth_certificates,certificate_number',
            'issue_date'           => 'nullable|date',
            'issued_by_officer_id' => 'nullable|integer|exists:registration_officers,officer_id',
            'remarks'              => 'nullable|string',
        ];
    }
}