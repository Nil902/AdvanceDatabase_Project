<?php

namespace App\Http\Requests\Citizen;

use Illuminate\Foundation\Http\FormRequest;

class StoreCitizenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('citizen:create');
    }

    public function rules(): array
    {
        return [
            'full_name_kh' => 'required|string|max:255',
            'full_name_en' => 'nullable|string|max:255',
            'gender' => 'required|string|max:20',
            'date_of_birth' => 'required|date|before_or_equal:today',
            'birth_place_village_id' => 'nullable|integer|exists:villages,village_id',
            'nationality' => 'nullable|string|max:100',
            'occupation' => 'nullable|string|max:255',
        ];
    }
}
