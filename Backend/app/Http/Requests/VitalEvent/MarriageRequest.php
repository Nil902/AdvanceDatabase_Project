<?php

namespace App\Http\Requests\VitalEvent;

use App\Models\Citizen;
use App\Models\MarriageCertificate;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class MarriageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('vital:marriage');
    }

    public function rules(): array
    {
        return [
            'spouse_a_id' => 'required|integer|exists:citizens,citizen_id|different:spouse_b_id',
            'spouse_b_id' => 'required|integer|exists:citizens,citizen_id',
            'marriage_date' => 'required|date|before_or_equal:today',
            'certificate_number' => 'nullable|string|max:100|unique:marriage_certificates,certificate_number',
            'location' => 'nullable|string|max:255',
            'witnesses' => 'nullable|array|max:10',
            'witnesses.*.witness_name' => 'required_with:witnesses|string|max:255',
            'witnesses.*.national_id' => 'nullable|string|max:50',
            'witnesses.*.phone_number' => 'nullable|string|max:30',
        ];
    }

    /**
     * Domain eligibility checks that need the citizens' own records: both spouses
     * must be alive, of legal marriage age on the marriage date, and not already
     * in an active marriage (monogamy). Runs only once the structural rules pass.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $marriageDate = Carbon::parse($this->input('marriage_date'));

            foreach (['spouse_a_id', 'spouse_b_id'] as $field) {
                $citizen = Citizen::find($this->input($field));
                if (! $citizen) {
                    continue;
                }

                if ($citizen->date_of_death !== null) {
                    $validator->errors()->add($field, 'This person is recorded as deceased and cannot marry.');

                    continue;
                }

                if ($citizen->date_of_birth && $citizen->date_of_birth->copy()->addYears(18)->gt($marriageDate)) {
                    $validator->errors()->add($field, 'This person is under the legal marriage age (18) on the marriage date.');
                }

                $alreadyMarried = MarriageCertificate::where('status', 'active')
                    ->where(fn ($q) => $q->where('spouse_a_id', $citizen->citizen_id)
                        ->orWhere('spouse_b_id', $citizen->citizen_id))
                    ->exists();
                if ($alreadyMarried) {
                    $validator->errors()->add($field, 'This person is already in an active marriage.');
                }
            }
        });
    }
}
