<?php

namespace App\Http\Requests\IdCard;

use Illuminate\Foundation\Http\FormRequest;

class DispatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentAccessToken()->can('id_card:dispatch');
    }

    public function rules(): array
    {
        return [
            'tracking_number'     => 'required|string|max:100|unique:dispatch_tracking,tracking_number',
            'distribution_point'  => 'required|string|max:255',
            'print_facility'      => 'nullable|string|max:255',
        ];
    }
}