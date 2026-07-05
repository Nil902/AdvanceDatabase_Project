<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Only the parts of config/auth.php that differ from Laravel's default
    | are shown here — merge these three keys into your existing file rather
    | than replacing it wholesale, since the default file has other settings
    | (passwords, password_timeout, etc.) you likely still want.
    |--------------------------------------------------------------------------
    */

    'defaults' => [
        'guard' => 'api',
        'passwords' => 'system_users',
    ],

    'guards' => [
        'api' => [
            'driver' => 'api_token', // registered in AppServiceProvider::boot()
            'provider' => 'system_users',
        ],
    ],

    'providers' => [
        'system_users' => [
            'driver' => 'eloquent',
            'model' => App\Models\SystemUser::class,
        ],
    ],

];
