<?php

namespace App\Http\Requests\Citizen;

use Illuminate\Foundation\Http\FormRequest;

class FingerprintUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('citizen:upload_fingerprint');
    }

    public function rules(): array
    {
        return [
            'template_data' => 'required|json',
            'finger_positions' => 'required|array|min:1',
            'finger_positions.*' => 'string|in:right_thumb,right_index,right_middle,right_ring,right_pinky,left_thumb,left_index,left_middle,left_ring,left_pinky',
        ];
    }
}
