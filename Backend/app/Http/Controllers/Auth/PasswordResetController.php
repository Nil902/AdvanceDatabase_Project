<?php

// app/Http/Controllers/Auth/PasswordResetController.php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SystemUser;
use App\Models\UserAuthToken;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class PasswordResetController extends Controller
{
    public function sendOtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $email = $request->email;

        $user = SystemUser::where('email', $email)->first();

        if (! $user) {
            return response()->json(['message' => 'If that email is registered, an OTP has been sent.']);
        }

        $otp = random_int(100000, 999999);

        DB::table('password_otps')->where('email', $email)->delete();

        DB::table('password_otps')->insert([
            'email' => $email,
            'otp' => Hash::make($otp),
            'expires_at' => Carbon::now()->addMinutes(10),
            'created_at' => Carbon::now(),
        ]);

        Mail::raw("Your password reset code is: {$otp}. It expires in 10 minutes.", function ($message) use ($email) {
            $message->to($email)->subject('Password Reset OTP');
        });

        return response()->json(['message' => 'If that email is registered, an OTP has been sent.']);
    }

    // Step 2: Verify OTP
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|numeric',
        ]);

        $record = DB::table('password_otps')->where('email', $request->email)->first();

        if (! $record || Carbon::parse($record->expires_at)->isPast()) {
            return response()->json(['message' => 'OTP has expired or does not exist.'], 422);
        }

        if (! Hash::check($request->otp, $record->otp)) {
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
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Double check OTP validity to prevent direct API bypass spikes
        $record = DB::table('password_otps')->where('email', $request->email)->first();

        if (! $record || Carbon::parse($record->expires_at)->isPast() || ! Hash::check($request->otp, $record->otp)) {
            return response()->json(['message' => 'Session expired or invalid token request.'], 422);
        }

        $user = SystemUser::where('email', $request->email)->firstOrFail();
        $user->update([
            'password_hash' => Hash::make($request->password),
            'password_changed_at' => now(),
        ]);

        UserAuthToken::where('user_id', $user->user_id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        DB::table('password_otps')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Your password has been successfully updated.']);
    }
}
