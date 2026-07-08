<?php

namespace App\Http\Requests\IdCard;

use Illuminate\Foundation\Http\FormRequest;

class StoreIdCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('id_card:create');
    }

    public function rules(): array
    {
        return [
            'citizen_id'          => 'required|integer|exists:citizens,citizen_id',
            'card_serial_number'  => 'required|string|max:100|unique:identity_cards,card_serial_number',
            'card_type'           => 'required|in:national_id,temp_id,foreigner_id',
            'status'              => 'required|in:active,expired,revoked,lost,stolen',
            'issue_date'          => 'required|date',
            'expiry_date'         => 'required|date|after:issue_date',
            'marriage_cert_id'    => 'nullable|integer|exists:marriage_certificates,certificate_id',
            'biometric_ref'       => 'nullable|uuid',
            'replaces_card_id'    => 'nullable|integer|exists:identity_cards,card_id',
        ];
    }
}