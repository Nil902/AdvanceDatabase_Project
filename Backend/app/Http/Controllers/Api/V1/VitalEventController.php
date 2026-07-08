<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\VitalEvent\BirthRequest;
use App\Http\Requests\VitalEvent\DeathRequest;
use App\Http\Requests\VitalEvent\DivorceRequest;
use App\Http\Requests\VitalEvent\MarriageRequest;
use App\Services\VitalEventService;

class VitalEventController extends Controller
{
    public function __construct(
        private VitalEventService $vitalEventService
    ) {}

    public function marriage(MarriageRequest $request)
    {
        $cert = $this->vitalEventService->recordMarriage(
            $request->validated(),
            $request->user()->user_id
        );

        return response()->json([
            'message' => 'Marriage recorded',
            'certificate' => $cert,
        ], 201);
    }

    public function divorce(DivorceRequest $request)
    {
        $this->vitalEventService->recordDivorce(
            $request->validated(),
            $request->user()->user_id
        );

        return response()->json(['message' => 'Divorce recorded'], 201);
    }

    public function birth(BirthRequest $request)
    {
        $cert = $this->vitalEventService->recordBirth($request->validated());

        return response()->json(['message' => 'Birth recorded', 'certificate' => $cert], 201);
    }

    public function death(DeathRequest $request)
    {
        $this->vitalEventService->recordDeath($request->validated());

        return response()->json(['message' => 'Death recorded'], 201);
    }
}
