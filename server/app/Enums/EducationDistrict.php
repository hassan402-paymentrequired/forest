<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum EducationDistrict: string
{
    use HasOptions;

    case DistrictI = 'district_1';
    case DistrictII = 'district_2';
    case DistrictIII = 'district_3';
    case DistrictIV = 'district_4';
    case DistrictV = 'district_5';
    case DistrictVI = 'district_6';

    public function label(): string
    {
        return match ($this) {
            self::DistrictI => 'District I',
            self::DistrictII => 'District II',
            self::DistrictIII => 'District III',
            self::DistrictIV => 'District IV',
            self::DistrictV => 'District V',
            self::DistrictVI => 'District VI',
        };
    }
}
