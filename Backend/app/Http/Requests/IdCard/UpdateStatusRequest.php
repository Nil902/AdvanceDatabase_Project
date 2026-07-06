<?php

namespace App\Http\Requests\IdCard;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('id_card:update_status');
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:active,suspended,revoked',
            'reason' => 'nullable|string|max:500',
        ];
    }
}