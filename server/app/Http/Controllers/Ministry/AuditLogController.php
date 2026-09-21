<?php

namespace App\Http\Controllers\Ministry;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Models\MinistryAuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * Display who did what in the ministry portal, newest first.
     */
    public function index(Request $request): Response
    {
        $action = AuditAction::tryFrom((string) $request->query('action'));

        $logs = MinistryAuditLog::query()
            ->with('actor:id,name')
            ->when($action, fn ($query, AuditAction $action) => $query->where('action', $action))
            ->when($request->string('search')->trim()->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('search')->trim()->toString();

                $query->where(fn ($query) => $query
                    ->whereLike('subject_label', "%{$search}%")
                    ->orWhereHas('actor', fn ($query) => $query->whereLike('name', "%{$search}%")));
            })
            ->latest()
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (MinistryAuditLog $log): array => [
                'id' => $log->id,
                'action' => $log->action->value,
                'action_label' => $log->action->label(),
                'actor' => $log->actor?->name,
                'subject' => $log->subject_label,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'at' => $log->created_at?->toIso8601String(),
            ]);

        return Inertia::render('ministry/audit-log', [
            'logs' => $logs,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'action' => $action?->value ?? '',
            ],
            'actions' => AuditAction::options(),
        ]);
    }
}
