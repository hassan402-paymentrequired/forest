<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum SchoolType: string
{
    use HasOptions;

    case Public = 'public';
    case Private = 'private';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
