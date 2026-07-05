<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAbility
{
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        $token = $request->user()?->currentToken;

        if (! $token || (! $token->hasAbility($ability) && ! $token->hasAbility('*'))) {
            abort(403, "Missing ability: {$ability}");
        }

        return $next($request);
    }
}
