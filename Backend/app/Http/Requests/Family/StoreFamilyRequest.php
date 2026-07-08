<?php

namespace App\Http\Requests\Family;

use Illuminate\Foundation\Http\FormRequest;

class StoreFamilyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('family:create');
    }

    public function rules(): array
    {
        return [
            'family_code'      => 'nullable|string|max:50|unique:family_units,family_code',
            'head_citizen_id'  => 'required|integer|exists:citizens,citizen_id',
            'members'          => 'nullable|array',
            'members.*.citizen_id' => 'required|integer|exists:citizens,citizen_id',
            'members.*.relationship' => 'required|string|exists:relationship_types,label',
        ];
    }
}