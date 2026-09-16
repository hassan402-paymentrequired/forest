<?php

use App\Models\MinistryUser;
use App\Models\SchoolUser;

test('a school user can log in with valid credentials', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->post(route('school.login.store'), [
        'email' => $schoolUser->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('school.dashboard'));
    $this->assertAuthenticatedAs($schoolUser, 'school');
});

test('a school user cannot log in with an invalid password', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->post(route('school.login.store'), [
        'email' => $schoolUser->email,
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest('school');
});

test('a ministry account cannot use the school guard', function () {
    $ministryUser = MinistryUser::factory()->create();

    $response = $this->post(route('school.login.store'), [
        'email' => $ministryUser->email,
        'password' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest('school');
});

test('a school user can log out', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('school.logout'));

    $response->assertRedirect(route('school.login'));
    $this->assertGuest('school');
});

test('guests visiting a school-protected route are redirected to the school login', function () {
    $response = $this->get(route('school.dashboard'));

    $response->assertRedirect(route('school.login'));
});

test('guests visiting a ministry-protected route are redirected to the ministry login', function () {
    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('login'));
});
