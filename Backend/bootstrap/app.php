<?php

use App\Http\Middleware\EnsureAbility;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'ability' => EnsureAbility::class,
        ]);

        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });

        $exceptions->render(function (Throwable $e, $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            // Derive the correct HTTP status. HttpException subclasses (abort(403),
            // abort(404), throttle 429, method-not-allowed 405, …) carry their own
            // status code and MUST be honoured — otherwise the ability middleware's
            // 403 and the throttle 429 would all collapse into a generic 500.
            $status = match (true) {
                $e instanceof ValidationException => 422,
                $e instanceof AuthenticationException => 401,
                $e instanceof AuthorizationException => 403,
                $e instanceof ModelNotFoundException => 404,
                $e instanceof HttpExceptionInterface => $e->getStatusCode(),
                default => 500,
            };

            // Never leak internal error details (SQL, stack traces, file paths) to
            // API clients on a genuine server error. Client errors (4xx) carry a
            // safe, human-readable message; 5xx get a generic one unless debugging.
            $message = $status >= 500 && ! config('app.debug')
                ? 'Server error. Please try again later.'
                : ($e->getMessage() ?: 'Request failed.');

            return response()->json([
                'message' => $message,
                'errors' => $e instanceof ValidationException ? $e->errors() : null,
            ], $status);
        });
    })->create();
