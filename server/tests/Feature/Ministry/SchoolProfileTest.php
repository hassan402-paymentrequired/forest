<?php

use App\Enums\AuditAction;
use App\Enums\EducationDistrict;
use App\Enums\Lga;
use App\Enums\SchoolLevel;
use App\Enums\SchoolType;
use App\Models\MinistryAuditLog;
use App\Models\MinistryUser;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Support\Facades\Auth;

beforeEach(function () {
    $this->ministryUser = MinistryUser::factory()->create();
});

describe('updating a school profile', function () {
    test('a ministry user can set a school\'s code, type, level and location', function () {
        $school = School::factory()->active()->create();

        $response = $this->actingAs($this->ministryUser)->put(route('schools.update', $school), [
            'name' => 'Lagos Model College',
            'code' => 'LG-0042',
            'type' => 'public',
            'level' => 'combined',
            'lga' => 'eti_osa',
            'education_district' => 'district_4',
            'address' => '12 Marina Road',
        ]);

        $response->assertRedirect(route('schools.show', $school));

        $school->refresh();
        expect($school->name)->toBe('Lagos Model College')
            ->and($school->code)->toBe('LG-0042')
            ->and($school->type)->toBe(SchoolType::Public)
            ->and($school->level)->toBe(SchoolLevel::Combined)
            ->and($school->lga)->toBe(Lga::EtiOsa)
            ->and($school->education_district)->toBe(EducationDistrict::DistrictIV)
            ->and($school->address)->toBe('12 Marina Road');
    });

    test('the contact email and status cannot be changed through the profile', function () {
        $school = School::factory()->active()->create(['contact_email' => 'admin@school.test']);

        $this->actingAs($this->ministryUser)->put(route('schools.update', $school), [
            'name' => $school->name,
            'contact_email' => 'someone@else.test',
            'status' => 'suspended',
        ]);

        expect($school->fresh()->contact_email)->toBe('admin@school.test')
            ->and($school->fresh()->status->value)->toBe('active');
    });

    test('profile fields can be cleared', function () {
        $school = School::factory()->active()->withProfile()->create();

        $this->actingAs($this->ministryUser)->put(route('schools.update', $school), [
            'name' => $school->name,
            'code' => '',
            'type' => '',
            'lga' => '',
        ]);

        expect($school->fresh()->code)->toBeNull()
            ->and($school->fresh()->type)->toBeNull()
            ->and($school->fresh()->lga)->toBeNull();
    });

    test('it validates the name and the enum values', function () {
        $school = School::factory()->active()->create();

        $this->actingAs($this->ministryUser)->put(route('schools.update', $school), [
            'name' => '',
            'type' => 'charter',
            'lga' => 'atlantis',
            'education_district' => 'district_9',
            'level' => 'nursery',
        ])->assertSessionHasErrors(['name', 'type', 'lga', 'education_district', 'level']);
    });

    test('a school code must be unique, but a school can keep its own', function () {
        School::factory()->active()->create(['code' => 'LG-0001']);
        $school = School::factory()->active()->create(['code' => 'LG-0002']);

        $this->actingAs($this->ministryUser)->put(route('schools.update', $school), [
            'name' => $school->name,
            'code' => 'LG-0001',
        ])->assertSessionHasErrors('code');

        $this->actingAs($this->ministryUser)->put(route('schools.update', $school), [
            'name' => 'Renamed',
            'code' => 'LG-0002',
        ])->assertSessionHasNoErrors();
    });

    test('guests and school users cannot update a school', function () {
        $school = School::factory()->active()->create();

        $this->put(route('schools.update', $school), ['name' => 'Hacked'])->assertRedirect(route('login'));

        // actingAs() makes the school guard the default for the test; a real school
        // session leaves the default (ministry) guard signed out.
        $this->actingAs(SchoolUser::factory()->for($school)->create(), 'school');
        Auth::shouldUse('web');

        $this->put(route('schools.update', $school), ['name' => 'Hacked'])->assertRedirect(route('login'));

        expect($school->fresh()->name)->not->toBe('Hacked');
    });
});

describe('the school list', function () {
    test('it filters by LGA, district and type', function () {
        School::factory()->active()->create(['name' => 'Ikeja Public', 'lga' => Lga::Ikeja, 'education_district' => EducationDistrict::DistrictI, 'type' => SchoolType::Public]);
        School::factory()->active()->create(['name' => 'Ikeja Private', 'lga' => Lga::Ikeja, 'education_district' => EducationDistrict::DistrictI, 'type' => SchoolType::Private]);
        School::factory()->active()->create(['name' => 'Surulere Public', 'lga' => Lga::Surulere, 'education_district' => EducationDistrict::DistrictII, 'type' => SchoolType::Public]);

        $names = fn (array $query) => collect(
            $this->actingAs($this->ministryUser)->get(route('schools.index', $query))->viewData('page')['props']['schools']['data'],
        )->pluck('name')->sort()->values()->all();

        expect($names(['lga' => 'ikeja']))->toBe(['Ikeja Private', 'Ikeja Public'])
            ->and($names(['lga' => 'ikeja', 'type' => 'private']))->toBe(['Ikeja Private'])
            ->and($names(['education_district' => 'district_2']))->toBe(['Surulere Public']);
    });

    test('it finds a school by its code', function () {
        School::factory()->active()->create(['name' => 'Coded School', 'code' => 'LG-7777']);
        School::factory()->active()->create(['name' => 'Other School']);

        $this->actingAs($this->ministryUser)->get(route('schools.index', ['search' => 'LG-7777']))->assertInertia(fn ($page) => $page
            ->has('schools.data', 1)
            ->where('schools.data.0.name', 'Coded School'));
    });
});

describe('the audit log', function () {
    test('inviting, updating, suspending and reactivating a school are each recorded', function () {
        $this->actingAs($this->ministryUser)->post(route('schools.store'), [
            'name' => 'New School',
            'contact_email' => 'new@school.test',
        ]);
        $school = School::query()->where('name', 'New School')->firstOrFail();
        $school->update(['status' => 'active']);

        $this->put(route('schools.update', $school), ['name' => 'New School']);
        $this->post(route('schools.suspend', $school));
        $this->post(route('schools.reactivate', $school));

        expect(MinistryAuditLog::query()->orderBy('created_at')->orderBy('id')->get()->pluck('action')->all())->toBe([
            AuditAction::SchoolInvited,
            AuditAction::SchoolUpdated,
            AuditAction::SchoolSuspended,
            AuditAction::SchoolReactivated,
        ]);

        $log = MinistryAuditLog::query()->where('action', AuditAction::SchoolSuspended)->sole();
        expect($log->ministry_user_id)->toBe($this->ministryUser->id)
            ->and($log->subject_id)->toBe($school->id)
            ->and($log->subject_label)->toBe('New School');
    });

    test('an action that is refused is not recorded', function () {
        $school = School::factory()->suspended()->create();

        $this->actingAs($this->ministryUser)->post(route('schools.suspend', $school))->assertForbidden();

        expect(MinistryAuditLog::query()->count())->toBe(0);
    });

    test('the audit page lists entries newest first and can filter by action and search', function () {
        $other = MinistryUser::factory()->create(['name' => 'Ada Okafor']);
        MinistryAuditLog::factory()->create(['ministry_user_id' => $this->ministryUser->id, 'action' => AuditAction::SchoolSuspended, 'subject_label' => 'Alpha College', 'created_at' => now()->subDay()]);
        MinistryAuditLog::factory()->create(['ministry_user_id' => $other->id, 'action' => AuditAction::SchoolInvited, 'subject_label' => 'Beta Academy', 'created_at' => now()]);

        $this->actingAs($this->ministryUser)->get(route('ministry.audit-log'))->assertInertia(fn ($page) => $page
            ->component('ministry/audit-log')
            ->has('logs.data', 2)
            ->where('logs.data.0.subject', 'Beta Academy')
            ->where('logs.data.0.actor', 'Ada Okafor')
            ->where('logs.data.0.action_label', 'Invited a school'));

        $this->get(route('ministry.audit-log', ['action' => 'school_suspended']))->assertInertia(fn ($page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.subject', 'Alpha College'));

        $this->get(route('ministry.audit-log', ['search' => 'Ada']))->assertInertia(fn ($page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.subject', 'Beta Academy'));
    });

    test('guests cannot see the audit log', function () {
        $this->get(route('ministry.audit-log'))->assertRedirect(route('login'));
    });
});
