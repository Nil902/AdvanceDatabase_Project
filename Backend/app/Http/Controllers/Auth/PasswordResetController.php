<?php

// app/Http/Controllers/Auth/PasswordResetController.php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SystemUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class PasswordResetController extends Controller
{
    // Step 1: Generate & Send OTP
    public function sendOtp(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:system_users,email']);

        $email = $request->email;
        $otp = rand(100000, 999999); // Secure 6-digit code

        // Clear any previous OTPs for this email
        DB::table('password_otps')->where('email', $email)->delete();

        // Store OTP with a 10-minute lifetime
        DB::table('password_otps')->insert([
            'email' => $email,
            'otp' => Hash::make($otp), // Hash it for security
            'expires_at' => Carbon::now()->addMinutes(10),
            'created_at' => Carbon::now()
        ]);

        // Send Email (Create a standard Laravel Mailable or use raw mail for testing)
        Mail::raw("Your password reset code is: {$otp}. It expires in 10 minutes.", function ($message) use ($email) {
            $message->to($email)->subject('Password Reset OTP');
        });

        return response()->json(['message' => 'OTP sent successfully to your email.']);
    }

    // Step 2: Verify OTP
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|numeric'
        ]);

        $record = DB::table('password_otps')->where('email', $request->email)->first();

        if (!$record || Carbon::parse($record->expires_at)->isPast()) {
            return response()->json(['message' => 'OTP has expired or does not exist.'], 422);
        }

        if (!Hash::check($request->otp, $record->otp)) {
            return response()->json(['message' => 'Invalid OTP code.'], 422);
        }

        return response()->json(['message' => 'OTP verified. Proceed to password reset.']);
    }

    // Step 3: Reset Password
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|numeric',
            'password' => 'required|string|min:8|confirmed'
        ]);

        // Double check OTP validity to prevent direct API bypass spikes
        $record = DB::table('password_otps')->where('email', $request->email)->first();

        if (!$record || Carbon::parse($record->expires_at)->isPast() || !Hash::check($request->otp, $record->otp)) {
            return response()->json(['message' => 'Session expired or invalid token request.'], 422);
        }

        $user = SystemUser::where('email', $request->email)->firstOrFail();
        $user->update([
            'password_hash' => Hash::make($request->password)
        ]);

        // Clean up OTP entry
        DB::table('password_otps')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Your password has been successfully updated.']);
    }
}
