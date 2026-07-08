<?php

namespace App\Http\Requests\VitalEvent;

use Illuminate\Foundation\Http\FormRequest;

class MarriageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('vital:marriage');
    }

    public function rules(): array
    {
        return [
            'spouse_a_id'        => 'required|integer|exists:citizens,citizen_id|different:spouse_b_id',
            'spouse_b_id'        => 'required|integer|exists:citizens,citizen_id',
            'marriage_date'      => 'required|date',
            'certificate_number' => 'nullable|string|max:100|unique:marriage_certificates,certificate_number',
            'location'           => 'nullable|string|max:255',
        ];
    }
}