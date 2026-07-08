<?php

return [

    'defaults' => [
        'guard' => 'api',
        'passwords' => 'system_users',
    ],

    'guards' => [
        'api' => [
            'driver' => 'api_token',
            'provider' => 'system_users',
        ],
    ],

    'providers' => [
        'system_users' => [
            'driver' => 'eloquent',
            'model' => App\Models\SystemUser::class,
        ],
    ],

    'passwords' => [
        'system_users' => [
            'provider' => 'system_users',
            'table' => 'password_otps',
            'expire' => 10,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => 10800,

];
