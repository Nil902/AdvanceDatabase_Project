<?php

namespace App\Mail;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

/**
 * Sends mail through the Gmail REST API over HTTPS (443) instead of SMTP.
 *
 * DigitalOcean blocks outbound SMTP ports (25/465/587) on droplets, so the
 * usual Gmail SMTP transport can never connect. The Gmail API travels over
 * plain HTTPS, which is open, and delivers as the authorized Gmail account
 * itself — no third-party relay involved.
 *
 * Auth is OAuth2: a long-lived refresh token (obtained once, out of band) is
 * exchanged for a short-lived access token that we cache for ~55 minutes.
 */
class GmailApiTransport extends AbstractTransport
{
    public function __construct(
        private readonly string $clientId,
        private readonly string $clientSecret,
        private readonly string $refreshToken,
        private readonly string $userId = 'me',
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        // Gmail's messages.send wants the full RFC 2822 message, base64url-encoded.
        $raw = rtrim(strtr(base64_encode($message->toString()), '+/', '-_'), '=');

        $response = Http::withToken($this->accessToken())
            ->post("https://gmail.googleapis.com/gmail/v1/users/{$this->userId}/messages/send", [
                'raw' => $raw,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Gmail API send failed: '.$response->body());
        }
    }

    private function accessToken(): string
    {
        return Cache::remember('gmail_api_access_token', 3300, function () {
            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'refresh_token' => $this->refreshToken,
                'grant_type' => 'refresh_token',
            ]);

            if ($response->failed()) {
                throw new RuntimeException('Gmail OAuth token refresh failed: '.$response->body());
            }

            return (string) $response->json('access_token');
        });
    }

    public function __toString(): string
    {
        return 'gmail_api';
    }
}
