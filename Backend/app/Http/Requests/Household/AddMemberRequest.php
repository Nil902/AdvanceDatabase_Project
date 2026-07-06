<?php

namespace App\Http\Requests\Household;

use Illuminate\Foundation\Http\FormRequest;

class AddMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('household:add_member');
    }

    public function rules(): array
    {
        return [
            'citizen_id'        => 'required|integer|exists:citizens,citizen_id',
            'relation_to_head'  => 'required|string|max:100',
            'joined_date'       => 'nullable|date',
        ];
    }
}