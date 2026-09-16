<?php

namespace App\Enums;

enum GradeLetter: string
{
    case A = 'a';
    case B = 'b';
    case C = 'c';
    case D = 'd';
    case F = 'f';

    /**
     * Resolve a grade letter from a total score out of 100.
     */
    public static function fromTotal(int $total): self
    {
        return match (true) {
            $total >= 70 => self::A,
            $total >= 60 => self::B,
            $total >= 50 => self::C,
            $total >= 40 => self::D,
            default => self::F,
        };
    }
}
