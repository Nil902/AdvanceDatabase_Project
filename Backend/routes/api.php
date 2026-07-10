<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\BirthCertificateController;
use App\Http\Controllers\Api\V1\CitizenController;
use App\Http\Controllers\Api\V1\FamilyController;
use App\Http\Controllers\Api\V1\HouseholdController;
use App\Http\Controllers\Api\V1\IdCardController;
use App\Http\Controllers\Api\V1\LocationController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\VitalEventController;
use App\Http\Controllers\Auth\PasswordResetController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Version 1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Public Endpoints ──────────────────────────────────────────────────
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1'); // 5 attempts/min per IP

    Route::post('/forgot-password', [PasswordResetController::class, 'sendOtp'])
        ->middleware('throttle:5,1');
    Route::post('/verify-otp', [PasswordResetController::class, 'verifyOtp'])
        ->middleware('throttle:5,1');
    Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])
        ->middleware('throttle:5,1');

    // Public ID card verification – third‑party validation (rate‑limited)
    Route::post('id-cards/verify', [IdCardController::class, 'verifyPublic'])
        ->middleware('throttle:30,1');

    // ── Location Data (public, Redis-cached) ────────────────────────────
    Route::prefix('locations')->group(function () {
        Route::get('provinces', [LocationController::class, 'provinces']);
        Route::get('provinces/{provinceCode}/districts', [LocationController::class, 'districts']);
        Route::get('districts/{districtCode}/communes', [LocationController::class, 'communes']);
        Route::get('communes/{communeCode}/villages', [LocationController::class, 'villages']);
    });

    // ── Authenticated Endpoints (any valid token) ──────────────────────
    Route::middleware('auth:api')->group(function () {

        // Auth
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // ── Birth Certificates ───────────────────────────────────────────
        Route::apiResource('birth-certificates', BirthCertificateController::class)
            ->parameters(['birth-certificates' => 'id'])
            ->middleware('ability:birth:read');
        Route::post('birth-certificates/{id}/verify', [BirthCertificateController::class, 'verify'])
            ->middleware('ability:birth:verify');
        Route::post('birth-certificates/{id}/print', [BirthCertificateController::class, 'print'])
            ->middleware('ability:birth:print');

        // ── Citizens ──────────────────────────────────────────────────────
        Route::put('citizens/{id}', [CitizenController::class, 'update']);
        Route::post('citizens/{id}/photo', [CitizenController::class, 'uploadPhoto']);
        Route::post('citizens/{id}/fingerprint', [CitizenController::class, 'uploadFingerprint']);
        Route::post('citizens/{id}/assign-nid', [CitizenController::class, 'assignNid']);

        // ── ID Cards ─────────────────────────────────────────────────────
        Route::get('id-cards/search', [IdCardController::class, 'search'])
            ->middleware('ability:id_card:read');
        Route::post('id-cards', [IdCardController::class, 'store']);
        Route::post('id-cards/{id}/renew', [IdCardController::class, 'renew']);
        Route::post('id-cards/{id}/replace', [IdCardController::class, 'replace']);
        Route::patch('id-cards/{id}/status', [IdCardController::class, 'updateStatus']);
        Route::post('id-cards/{id}/dispatch', [IdCardController::class, 'dispatch']);

        // ── Households ───────────────────────────────────────────────────
        Route::post('households', [HouseholdController::class, 'store']);
        Route::get('households/{id}/members', [HouseholdController::class, 'members'])
            ->middleware('ability:household:read');
        Route::post('households/{id}/members', [HouseholdController::class, 'addMember']);
        Route::delete('households/{id}/members/{citizenId}', [HouseholdController::class, 'removeMember'])
            ->middleware('ability:household:update');
        Route::patch('households/{id}/head', [HouseholdController::class, 'changeHead']);
        Route::put('households/{id}/address', [HouseholdController::class, 'updateAddress']);
        Route::post('households/transfer', [HouseholdController::class, 'transfer']);
        Route::get('households/{id}/history', [HouseholdController::class, 'history'])
            ->middleware('ability:household:read');

        // ── Families ─────────────────────────────────────────────────────
        Route::post('families', [FamilyController::class, 'store']);
        Route::get('families/search', [FamilyController::class, 'search'])
            ->middleware('ability:family:read');
        Route::put('families/{id}', [FamilyController::class, 'update']);
        Route::post('families/{id}/members', [FamilyController::class, 'addMember']);
        Route::get('families/{id}/tree', [FamilyController::class, 'tree'])
            ->middleware('ability:family:read');

        // ── Vital Events ─────────────────────────────────────────────────
        Route::post('vital-events/marriage', [VitalEventController::class, 'marriage']);
        Route::post('vital-events/divorce', [VitalEventController::class, 'divorce']);
        Route::post('vital-events/birth', [VitalEventController::class, 'birth']);
        Route::post('vital-events/death', [VitalEventController::class, 'death']);

        // ── Reports ──────────────────────────────────────────────────────
        Route::get('reports/summary', [ReportController::class, 'summary'])
            ->middleware('ability:reports:read');
        Route::get('reports/demographics', [ReportController::class, 'demographics'])
            ->middleware('ability:reports:read');
        Route::get('reports/export', [ReportController::class, 'export'])
            ->middleware('ability:reports:read');

        // ── Location Cache Management ────────────────────────────────────
        Route::delete('locations/cache', [LocationController::class, 'clearCache']);
    });
});
