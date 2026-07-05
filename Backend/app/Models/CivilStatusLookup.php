<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CivilStatusLookup extends Model
{
    protected $primaryKey = 'status_id';
    public $timestamps = false;

    protected $fillable = ['label']; // single | married | divorced | widowed | separated

    public function history()
    {
        return $this->hasMany(CivilStatusHistory::class, 'status_id', 'status_id');
    }
}
