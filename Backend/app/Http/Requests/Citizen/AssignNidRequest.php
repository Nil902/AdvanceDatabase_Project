<?php

namespace App\Http\Requests\Citizen;

use Illuminate\Foundation\Http\FormRequest;

class AssignNidRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('citizen:assign_nid');
    }

    public function rules(): array
    {
        return [];
    }
}