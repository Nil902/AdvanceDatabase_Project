<?php

namespace App\Http\Requests\Household;

use Illuminate\Foundation\Http\FormRequest;

class TransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('household:transfer');
    }

    public function rules(): array
    {
        return [
            'citizen_id' => 'required|integer|exists:citizens,citizen_id',
            'from_household_id' => 'nullable|integer|exists:households,household_id',
            'to_household_id' => 'required|integer|exists:households,household_id|different:from_household_id',
            'reason' => 'nullable|string|max:255',
            'authorized_by' => 'nullable|string|max:255',
            'relation_to_head' => 'nullable|string|max:100',
        ];
    }
}
