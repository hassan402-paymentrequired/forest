<?php

namespace App\Models;

use App\Enums\SchoolStatus;
use Database\Factories\SchoolFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $name
 * @property string $contact_email
 * @property SchoolStatus $status
 * @property string|null $invited_by
 * @property Carbon|null $activated_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'contact_email', 'status', 'invited_by', 'activated_at'])]
class School extends Model
{
    /** @use HasFactory<SchoolFactory> */
    use HasFactory, HasUlids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => SchoolStatus::class,
            'activated_at' => 'datetime',
        ];
    }

    /**
     * Get the ministry user who invited this school.
     *
     * @return BelongsTo<MinistryUser, $this>
     */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(MinistryUser::class, 'invited_by');
    }

    /**
     * Get the invitations issued for this school.
     *
     * @return HasMany<SchoolInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(SchoolInvitation::class);
    }

    /**
     * Get the platform accounts belonging to this school.
     *
     * @return HasMany<SchoolUser, $this>
     */
    public function schoolUsers(): HasMany
    {
        return $this->hasMany(SchoolUser::class);
    }

    /**
     * Get the teacher records belonging to this school.
     *
     * @return HasMany<Teacher, $this>
     */
    public function teachers(): HasMany
    {
        return $this->hasMany(Teacher::class);
    }
}
