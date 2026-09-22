<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\MinistryUserStatus;
use Database\Factories\MinistryUserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Ai\Concerns\HasConversations;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Passkeys\Passkey;
use Laravel\Passkeys\Passkeys;

/**
 * @property string $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property MinistryUserStatus $status
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'status'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class MinistryUser extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<MinistryUserFactory> */
    use HasConversations, HasFactory, HasUlids, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the schools this ministry user has invited.
     *
     * @return HasMany<School, $this>
     */
    public function invitedSchools(): HasMany
    {
        return $this->hasMany(School::class, 'invited_by');
    }

    /**
     * Whether this account may sign in and use the ministry portal.
     */
    public function isActive(): bool
    {
        return $this->status !== MinistryUserStatus::Inactive;
    }

    /**
     * Get the passkeys associated with this ministry user.
     *
     * @return HasMany<Passkey, $this>
     */
    public function passkeys(): HasMany
    {
        return $this->hasMany(Passkeys::passkeyModel(), 'ministry_user_id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => MinistryUserStatus::class,
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
