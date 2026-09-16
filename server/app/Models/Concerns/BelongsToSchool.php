<?php

namespace App\Models\Concerns;

use App\Models\School;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Scopes a model to the school of the currently authenticated school user.
 *
 * Every query against a model using this trait is automatically constrained
 * to the authenticated school's own rows, and every new record is stamped
 * with that school_id — so a controller can never accidentally read or
 * write another school's data by forgetting to filter manually.
 */
trait BelongsToSchool
{
    public static function bootBelongsToSchool(): void
    {
        static::addGlobalScope('school', function (Builder $builder): void {
            $schoolUser = Auth::guard('school')->user();

            if ($schoolUser) {
                $builder->where($builder->qualifyColumn('school_id'), $schoolUser->school_id);
            } else {
                $builder->whereRaw('1 = 0');
            }
        });

        static::creating(function ($model): void {
            if (! $model->school_id && ($schoolUser = Auth::guard('school')->user())) {
                $model->school_id = $schoolUser->school_id;
            }
        });
    }

    /**
     * Get the school this record belongs to.
     *
     * @return BelongsTo<School, $this>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
