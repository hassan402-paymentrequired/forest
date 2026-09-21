<?php

namespace App\Models;

use App\Enums\AuditAction;
use Database\Factories\MinistryAuditLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string|null $ministry_user_id
 * @property AuditAction $action
 * @property string|null $subject_type
 * @property string|null $subject_id
 * @property string|null $subject_label
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 */
#[Fillable(['ministry_user_id', 'action', 'subject_type', 'subject_id', 'subject_label', 'metadata'])]
class MinistryAuditLog extends Model
{
    /** @use HasFactory<MinistryAuditLogFactory> */
    use HasFactory, HasUlids;

    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'action' => AuditAction::class,
            'metadata' => 'array',
        ];
    }

    /**
     * Get the ministry user who performed the action.
     *
     * @return BelongsTo<MinistryUser, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(MinistryUser::class, 'ministry_user_id');
    }
}
