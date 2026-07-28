<?php

namespace App\Http\Requests\VitalEvent;

use App\Models\MarriageCertificate;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class DivorceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('vital:divorce');
    }

    public function rules(): array
    {
        return [
            'marriage_cert_id' => 'required|integer|exists:marriage_certificates,certificate_id',
            'ruling_date' => 'required|date|before_or_equal:today',
            'court_reference' => 'nullable|string|max:100',
        ];
    }

    /**
     * The marriage being dissolved must still be active, and the ruling cannot
     * predate the marriage itself.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $marriage = MarriageCertificate::find($this->input('marriage_cert_id'));
            if (! $marriage) {
                return;
            }

            if ($marriage->status !== 'active') {
                $validator->errors()->add(
                    'marriage_cert_id',
                    "This marriage is not active (current status: {$marriage->status}) and cannot be divorced."
                );
            }

            $rulingDate = Carbon::parse($this->input('ruling_date'));
            if ($marriage->marriage_date && $rulingDate->lt($marriage->marriage_date)) {
                $validator->errors()->add('ruling_date', 'The ruling date cannot be before the marriage date.');
            }
        });
    }
}
