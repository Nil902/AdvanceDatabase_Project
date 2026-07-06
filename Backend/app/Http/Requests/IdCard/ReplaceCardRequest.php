<?php

namespace App\Http\Requests\IdCard;

use Illuminate\Foundation\Http\FormRequest;

class ReplaceCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('id_card:replace');
    }

    public function rules(): array
    {
        return [
            'reason' => 'required|string|in:lost,stolen,damaged',
        ];
    }
}