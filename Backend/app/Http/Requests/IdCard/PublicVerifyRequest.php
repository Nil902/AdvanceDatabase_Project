<?php

namespace App\Http\Requests\IdCard;

use Illuminate\Foundation\Http\FormRequest;

class PublicVerifyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'card_serial_number' => 'required|string|max:100',
        ];
    }
}