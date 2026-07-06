<?php

namespace App\Http\Requests\VitalEvent;

use Illuminate\Foundation\Http\FormRequest;

class DeathRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('vital:death');
    }

    public function rules(): array
    {
        return [
            'citizen_id' => 'required|integer|exists:citizens,citizen_id',
            'death_date' => 'nullable|date',
            'certificate_number' => 'nullable|string|max:100',
            'remarks' => 'nullable|string',
        ];
    }
}