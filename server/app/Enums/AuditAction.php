<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum AuditAction: string
{
    use HasOptions;

    case SchoolInvited = 'school_invited';
    case SchoolUpdated = 'school_updated';
    case SchoolSuspended = 'school_suspended';
    case SchoolReactivated = 'school_reactivated';
    case InvitationResent = 'invitation_resent';
    case TeamMemberInvited = 'team_member_invited';
    case TeamMemberDeactivated = 'team_member_deactivated';
    case TeamMemberReactivated = 'team_member_reactivated';
    case AnnouncementSent = 'announcement_sent';
    case AnnouncementArchived = 'announcement_archived';

    public function label(): string
    {
        return match ($this) {
            self::SchoolInvited => 'Invited a school',
            self::SchoolUpdated => 'Updated a school',
            self::SchoolSuspended => 'Suspended a school',
            self::SchoolReactivated => 'Reactivated a school',
            self::InvitationResent => 'Resent an invitation',
            self::TeamMemberInvited => 'Invited a team member',
            self::TeamMemberDeactivated => 'Deactivated a team member',
            self::TeamMemberReactivated => 'Reactivated a team member',
            self::AnnouncementSent => 'Sent an announcement',
            self::AnnouncementArchived => 'Archived an announcement',
        };
    }
}
