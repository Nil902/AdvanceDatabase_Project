<?php

namespace App\Http\Requests\BirthCertificate;

use App\Models\BirthCertificate;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateBirthCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('birth:update');
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'citizen_id' => 'sometimes|integer|exists:citizens,citizen_id|unique:birth_certificates,citizen_id,'.$id.',certificate_id',
            'mother_citizen_id' => 'nullable|integer|exists:citizens,citizen_id',
            'father_citizen_id' => 'nullable|integer|exists:citizens,citizen_id',
            'certificate_number' => 'sometimes|string|max:100|unique:birth_certificates,certificate_number,'.$id.',certificate_id',
            'issue_date' => 'nullable|date',
            'issued_by_officer_id' => 'nullable|integer|exists:registration_officers,officer_id',
            'registered_date' => 'nullable|date',
            'status' => 'sometimes|in:issued,reprinted,cancelled',
            'remarks' => 'nullable|string',
            // A correction to an already-verified certificate must state why.
            'amendment_reason' => 'nullable|string|max:500',
        ];
    }

    /**
     * Amending a verified certificate is a formal correction: it requires a
     * stated reason (which is stored and clears the prior verification).
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $cert = BirthCertificate::find($this->route('id'));
            if ($cert && $cert->verified_at !== null && blank($this->input('amendment_reason'))) {
                $validator->errors()->add(
                    'amendment_reason',
                    'This certificate is verified; an amendment reason is required to change it.'
                );
            }
        });
    }
}
