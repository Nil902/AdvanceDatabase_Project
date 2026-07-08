<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NationalityStatus extends Model
{
    protected $primaryKey = 'nationality_id';

    public $timestamps = false;

    protected $fillable = ['label'];

    public function history()
    {
        return $this->hasMany(NationalityHistory::class, 'nationality_id', 'nationality_id');
    }
}
