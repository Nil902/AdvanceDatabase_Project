<?php

namespace App\Http\Requests\Family;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFamilyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('family:update');
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'family_code'      => 'sometimes|string|max:50|unique:family_units,family_code,' . $id . ',family_unit_id',
            'head_citizen_id'  => 'sometimes|integer|exists:citizens,citizen_id',
        ];
    }
}