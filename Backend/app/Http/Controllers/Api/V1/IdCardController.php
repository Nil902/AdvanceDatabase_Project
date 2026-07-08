<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\IdCard\DispatchRequest;
use App\Http\Requests\IdCard\PublicVerifyRequest;
use App\Http\Requests\IdCard\RenewCardRequest;
use App\Http\Requests\IdCard\ReplaceCardRequest;
use App\Http\Requests\IdCard\StoreIdCardRequest;
use App\Http\Requests\IdCard\UpdateStatusRequest;
use App\Http\Resources\IdCardResource;
use App\Models\IdentityCard;
use App\Models\CardRequest;
use App\Models\CardStatusLog;
use App\Models\DispatchTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;

class IdCardController extends Controller
{
    public function search(Request $request)
    {
        $cards = QueryBuilder::for(IdentityCard::class)
            ->allowedFilters(
                AllowedFilter::exact('citizen_id'),
                AllowedFilter::exact('status'),
                AllowedFilter::exact('card_type'),
                'card_serial_number',
            )
            ->allowedSorts('issue_date', 'expiry_date')
            ->with(['citizen'])
            ->paginate($request->get('per_page', 20));

        return IdCardResource::collection($cards);
    }

    public function store(StoreIdCardRequest $request)
    {
        $card = DB::transaction(function () use ($request) {
            $card = IdentityCard::create($request->validated());

            CardRequest::create([
                'citizen_id' => $card->citizen_id,
                'request_type' => 'new',
                'request_status' => 'completed',
                'request_date' => now(),
                'result_card_id' => $card->card_id,
            ]);

            CardStatusLog::create([
                'card_id' => $card->card_id,
                'previous_status' => null,
                'new_status' => $card->status,
                'changed_by' => $request->user()->user_id,
                'changed_at' => now(),
            ]);

            return $card;
        });

        Cache::tags(['id_cards'])->flush();

        return new IdCardResource($card->load('citizen'));
    }

    public function renew(RenewCardRequest $request, int $id)
    {
        $oldCard = IdentityCard::findOrFail($id);

        if (! in_array($oldCard->status, ['active', 'expired'])) {
            return response()->json(['message' => 'Card cannot be renewed'], 422);
        }

        $newCard = DB::transaction(function () use ($oldCard, $request) {
            $oldCard->update(['status' => 'expired']);

            $newCard = IdentityCard::create([
                'citizen_id' => $oldCard->citizen_id,
                'card_serial_number' => $this->generateSerialNumber(),
                'card_type' => $oldCard->card_type,
                'status' => 'active',
                'issue_date' => now(),
                'expiry_date' => $request->expiry_date,
                'marriage_cert_id' => $oldCard->marriage_cert_id,
                'biometric_ref' => $oldCard->biometric_ref,
                'replaces_card_id' => $oldCard->card_id,
            ]);

            CardStatusLog::create([
                'card_id' => $oldCard->card_id,
                'previous_status' => 'active',
                'new_status' => 'expired',
                'reason' => 'Renewed',
                'changed_by' => $request->user()->user_id,
                'changed_at' => now(),
            ]);

            CardRequest::create([
                'citizen_id' => $oldCard->citizen_id,
                'request_type' => 'renewal',
                'request_status' => 'completed',
                'request_date' => now(),
                'result_card_id' => $newCard->card_id,
            ]);

            return $newCard;
        });

        Cache::tags(['id_cards'])->flush();

        return new IdCardResource($newCard->load('citizen'));
    }

    public function replace(ReplaceCardRequest $request, int $id)
    {
        $oldCard = IdentityCard::findOrFail($id);

        if (! in_array($oldCard->status, ['active', 'issued'])) {
            return response()->json(['message' => 'Card cannot be replaced'], 422);
        }

        $newCard = DB::transaction(function () use ($oldCard, $request) {
            $oldCard->update(['status' => 'revoked']);

            $newCard = IdentityCard::create([
                'citizen_id' => $oldCard->citizen_id,
                'card_serial_number' => $this->generateSerialNumber(),
                'card_type' => $oldCard->card_type,
                'status' => 'active',
                'issue_date' => now(),
                'expiry_date' => now()->addYears(10),
                'marriage_cert_id' => $oldCard->marriage_cert_id,
                'biometric_ref' => $oldCard->biometric_ref,
                'replaces_card_id' => $oldCard->card_id,
            ]);

            CardStatusLog::create([
                'card_id' => $oldCard->card_id,
                'previous_status' => $oldCard->getOriginal('status'),
                'new_status' => 'revoked',
                'reason' => 'Replaced: ' . $request->reason,
                'changed_by' => $request->user()->user_id,
                'changed_at' => now(),
            ]);

            CardRequest::create([
                'citizen_id' => $oldCard->citizen_id,
                'request_type' => 'replacement',
                'request_status' => 'completed',
                'request_date' => now(),
                'result_card_id' => $newCard->card_id,
            ]);

            return $newCard;
        });

        Cache::tags(['id_cards'])->flush();

        return new IdCardResource($newCard->load('citizen'));
    }

    public function updateStatus(UpdateStatusRequest $request, int $id)
    {
        $card = IdentityCard::findOrFail($id);

        $oldStatus = $card->status;
        $card->update(['status' => $request->status]);

        CardStatusLog::create([
            'card_id' => $card->card_id,
            'previous_status' => $oldStatus,
            'new_status' => $request->status,
            'reason' => $request->reason,
            'changed_by' => $request->user()->user_id,
            'changed_at' => now(),
        ]);

        Cache::tags(['id_cards'])->forget("id_card:{$id}");

        return new IdCardResource($card->load('citizen'));
    }

    public function dispatch(DispatchRequest $request, int $id)
    {
        $card = IdentityCard::findOrFail($id);

        $tracking = DispatchTracking::create([
            'card_id' => $card->card_id,
            'triggered_by' => $request->user()->user_id,
            'tracking_number' => $request->tracking_number,
            'distribution_point' => $request->distribution_point,
            'print_facility' => $request->print_facility,
            'dispatch_status' => 'dispatched',
            'dispatched_at' => now(),
        ]);

        return response()->json(['message' => 'Dispatch recorded', 'tracking' => $tracking], 200);
    }

    public function verifyPublic(PublicVerifyRequest $request)
    {
        $card = IdentityCard::where('card_serial_number', $request->card_serial_number)->first();

        if (! $card) {
            return response()->json(['valid' => false, 'message' => 'Card not found'], 404);
        }

        $valid = in_array($card->status, ['active', 'issued']);

        return response()->json([
            'valid' => $valid,
            'card_serial_number' => $card->card_serial_number,
            'status' => $card->status,
            'expiry_date' => $card->expiry_date?->toDateString(),
        ]);
    }

    private function generateSerialNumber(): string
    {
        return 'ID' . date('Ymd') . strtoupper(bin2hex(random_bytes(4)));
    }
}
