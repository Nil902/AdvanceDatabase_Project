<?php

namespace App\Http\Requests\Citizen;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCitizenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('citizen:update');
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'national_id_number'    => 'sometimes|string|max:50|unique:citizens,national_id_number,' . $id . ',citizen_id',
            'full_name_kh'          => 'sometimes|string|max:255',
            'full_name_en'          => 'nullable|string|max:255',
            'gender'                => 'sometimes|in:M,F',
            'date_of_birth'         => 'sometimes|date',
            'birth_place_village_id'=> 'nullable|integer|exists:villages,village_id',
            'nationality'           => 'nullable|string|max:100',
            'occupation'            => 'nullable|string|max:100',
        ];
    }
}