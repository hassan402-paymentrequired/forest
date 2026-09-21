<?php

namespace App\Actions\Ministry;

use App\Enums\AuditAction;
use App\Models\MinistryAuditLog;
use App\Models\MinistryUser;
use Illuminate\Database\Eloquent\Model;

/**
 * Records what a ministry user did, so the audit log page can answer who
 * changed what and when.
 */
class AuditLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function record(MinistryUser $actor, AuditAction $action, ?Model $subject = null, ?string $label = null, array $metadata = []): MinistryAuditLog
    {
        return MinistryAuditLog::create([
            'ministry_user_id' => $actor->id,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'subject_label' => $label ?? $subject?->getAttribute('name'),
            'metadata' => $metadata === [] ? null : $metadata,
        ]);
    }
}
