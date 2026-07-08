<?php

namespace App\Http\Requests\VitalEvent;

use Illuminate\Foundation\Http\FormRequest;

class DivorceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('vital:divorce');
    }

    public function rules(): array
    {
        return [
            'marriage_cert_id' => 'required|integer|exists:marriage_certificates,certificate_id',
            'ruling_date'      => 'required|date',
            'court_reference'  => 'nullable|string|max:100',
        ];
    }
}