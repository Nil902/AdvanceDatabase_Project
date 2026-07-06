<?php

namespace App\Http\Requests\Household;

use Illuminate\Foundation\Http\FormRequest;

class StoreHouseholdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('household:create');
    }

    public function rules(): array
    {
        return [
            'household_number'     => 'required|string|max:50|unique:households,household_number',
            'book_serial'          => 'nullable|string|max:100',
            'village_id'           => 'nullable|integer|exists:villages,village_id',
            'household_head_id'    => 'nullable|integer|exists:citizens,citizen_id',
            'house_no'             => 'nullable|string|max:50',
            'krom_no'              => 'nullable|string|max:50',
            'police_station'       => 'nullable|string|max:255',
            'address_detail'       => 'nullable|string',
            'issued_at'            => 'nullable|date',
        ];
    }
}