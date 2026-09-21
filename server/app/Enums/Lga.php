<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum Lga: string
{
    use HasOptions;

    case Agege = 'agege';
    case AjeromiIfelodun = 'ajeromi_ifelodun';
    case Alimosho = 'alimosho';
    case AmuwoOdofin = 'amuwo_odofin';
    case Apapa = 'apapa';
    case Badagry = 'badagry';
    case Epe = 'epe';
    case EtiOsa = 'eti_osa';
    case IbejuLekki = 'ibeju_lekki';
    case IfakoIjaiye = 'ifako_ijaiye';
    case Ikeja = 'ikeja';
    case Ikorodu = 'ikorodu';
    case Kosofe = 'kosofe';
    case LagosIsland = 'lagos_island';
    case LagosMainland = 'lagos_mainland';
    case Mushin = 'mushin';
    case Ojo = 'ojo';
    case OshodiIsolo = 'oshodi_isolo';
    case Shomolu = 'shomolu';
    case Surulere = 'surulere';

    public function label(): string
    {
        return match ($this) {
            self::AjeromiIfelodun => 'Ajeromi-Ifelodun',
            self::AmuwoOdofin => 'Amuwo-Odofin',
            self::EtiOsa => 'Eti-Osa',
            self::IbejuLekki => 'Ibeju-Lekki',
            self::IfakoIjaiye => 'Ifako-Ijaiye',
            self::OshodiIsolo => 'Oshodi-Isolo',
            self::LagosIsland => 'Lagos Island',
            self::LagosMainland => 'Lagos Mainland',
            default => ucfirst($this->value),
        };
    }
}
