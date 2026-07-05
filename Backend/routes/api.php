<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\PasswordResetController;

Route::prefix('v1')->group(function () {

    // ── Public ──────────────────────────────────────────────────────────
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1'); // 5 attempts/min per IP — slows brute force
    Route::post('/forgot-password', [PasswordResetController::class, 'sendOtp']);
    Route::post('/verify-otp', [PasswordResetController::class, 'verifyOtp']);
    Route::post('/reset-password', [PasswordResetController::class, 'resetPassword']);

    // ── Authenticated (any valid, non-expired, non-revoked token) ──────
    Route::middleware('auth:api')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // Every other module's routes go inside this same middleware group.
        // Example of how ability-gating layers on top of auth:api —
        // see the Birth Certificate guide for the full pattern:
        //
        // Route::apiResource('birth-certificates', BirthCertificateController::class)
        //     ->parameters(['birth-certificates' => 'id']);
        // Route::post('birth-certificates/{id}/verify', [BirthCertificateController::class, 'verify'])
        //     ->middleware('ability:birth:verify');
    });
});
