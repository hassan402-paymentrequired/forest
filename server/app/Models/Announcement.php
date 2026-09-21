<?php

namespace App\Models;

use App\Enums\AnnouncementStatus;
use Database\Factories\AnnouncementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string|null $ministry_user_id
 * @property string $title
 * @property string $body
 * @property AnnouncementStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['ministry_user_id', 'title', 'body', 'status'])]
class Announcement extends Model
{
    /** @use HasFactory<AnnouncementFactory> */
    use HasFactory, HasUlids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => AnnouncementStatus::class,
        ];
    }

    /**
     * Get the ministry user who sent the announcement.
     *
     * @return BelongsTo<MinistryUser, $this>
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(MinistryUser::class, 'ministry_user_id');
    }

    /**
     * Get the schools the announcement was sent to, with when each read it.
     *
     * @return BelongsToMany<School, $this>
     */
    public function schools(): BelongsToMany
    {
        return $this->belongsToMany(School::class)->withPivot('read_at')->withTimestamps();
    }
}
