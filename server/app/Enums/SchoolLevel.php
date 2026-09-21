<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum SchoolLevel: string
{
    use HasOptions;

    case Junior = 'junior';
    case Senior = 'senior';
    case Combined = 'combined';

    public function label(): string
    {
        return match ($this) {
            self::Junior => 'Junior Secondary',
            self::Senior => 'Senior Secondary',
            self::Combined => 'Combined',
        };
    }
}
