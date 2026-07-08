<?php

namespace App\Http\Requests\Family;

use Illuminate\Foundation\Http\FormRequest;

class AddMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('family:add_member');
    }

    public function rules(): array
    {
        return [
            'citizen_id' => 'required|integer|exists:citizens,citizen_id',
            'relationship' => 'required|string|exists:relationship_types,label',
            'verified' => 'nullable|boolean',
        ];
    }
}
