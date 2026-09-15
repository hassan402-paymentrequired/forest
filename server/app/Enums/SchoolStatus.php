<?php

namespace App\Enums;

enum SchoolStatus: string
{
    case Invited = 'invited';
    case Active = 'active';
    case Suspended = 'suspended';
}
