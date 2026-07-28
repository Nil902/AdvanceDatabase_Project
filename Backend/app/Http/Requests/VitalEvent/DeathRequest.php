<?php

namespace App\Http\Requests\VitalEvent;

use App\Models\Citizen;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class DeathRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->currentToken->hasAbility('vital:death');
    }

    public function rules(): array
    {
        return [
            'citizen_id' => 'required|integer|exists:citizens,citizen_id',
            'death_date' => 'nullable|date|before_or_equal:today',
            'certificate_number' => 'nullable|string|max:100',
            'remarks' => 'nullable|string',
        ];
    }

    /**
     * A person cannot be recorded dead twice, and the death cannot predate the
     * birth. These guard the cascade in VitalEventService::recordDeath().
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $citizen = Citizen::find($this->input('citizen_id'));
            if (! $citizen) {
                return;
            }

            if ($citizen->date_of_death !== null) {
                $validator->errors()->add('citizen_id', 'This person is already recorded as deceased.');

                return;
            }

            $deathDate = Carbon::parse($this->input('death_date') ?? now());
            if ($citizen->date_of_birth && $deathDate->lt($citizen->date_of_birth)) {
                $validator->errors()->add('death_date', 'The date of death cannot be before the date of birth.');
            }
        });
    }
}
