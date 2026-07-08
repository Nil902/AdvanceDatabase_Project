<?php

namespace App\Http\Requests\Household;

use Illuminate\Foundation\Http\FormRequest;

class ChangeHeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('household:change_head');
    }

    public function rules(): array
    {
        return [
            'new_head_citizen_id' => 'required|integer|exists:citizens,citizen_id',
        ];
    }
}