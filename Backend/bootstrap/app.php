<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\EnsureAbility;


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
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });

        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*')) {
                $status = match (true) {
                    $e instanceof \Illuminate\Validation\ValidationException => 422,
                    $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException => 404,
                    default => 500,
                };

                return response()->json([
                    'message' => $e->getMessage(),
                    'errors'  => $e instanceof \Illuminate\Validation\ValidationException ? $e->errors() : null,
                ], $status);
            }
        });
    })->create();
