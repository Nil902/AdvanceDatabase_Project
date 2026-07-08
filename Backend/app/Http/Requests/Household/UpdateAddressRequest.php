<?php

namespace App\Http\Requests\Household;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('household:update_address');
    }

    public function rules(): array
    {
        return [
            'village_id'     => 'nullable|integer|exists:villages,village_id',
            'house_no'       => 'nullable|string|max:50',
            'krom_no'        => 'nullable|string|max:50',
            'address_detail' => 'nullable|string',
        ];
    }
}