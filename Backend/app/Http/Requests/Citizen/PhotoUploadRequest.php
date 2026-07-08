<?php

namespace App\Http\Requests\Citizen;

use Illuminate\Foundation\Http\FormRequest;

class PhotoUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('citizen:upload_photo');
    }

    public function rules(): array
    {
        return [
            'photo' => 'required|image|max:2048',
        ];
    }
}
