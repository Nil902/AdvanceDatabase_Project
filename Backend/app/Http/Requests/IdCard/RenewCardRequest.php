<?php

namespace App\Http\Requests\IdCard;

use Illuminate\Foundation\Http\FormRequest;

class RenewCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('id_card:renew');
    }

    public function rules(): array
    {
        return [
            'expiry_date' => 'required|date|after:today',
        ];
    }
}
