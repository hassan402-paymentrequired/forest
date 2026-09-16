<?php

use App\Http\Controllers\Auth\SchoolAuthenticatedSessionController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\SchoolInvitationController;
use App\Http\Controllers\TeacherController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Ministry portal
Route::middleware(['auth', 'verified'])->prefix('ministry')->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::resource('schools', SchoolController::class)->only(['index', 'store']);
});

// School portal
Route::middleware('guest:school')->group(function () {
    Route::get('login', [SchoolAuthenticatedSessionController::class, 'create'])->name('school.login');
    Route::post('login', [SchoolAuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('school.login.store');

    Route::get('school-invitations/{invitation:token}', [SchoolInvitationController::class, 'create'])
        ->name('school-invitations.create');
    Route::post('school-invitations/{invitation:token}', [SchoolInvitationController::class, 'store'])
        ->name('school-invitations.store');
});

Route::middleware('auth:school')->group(function () {
    Route::post('logout', [SchoolAuthenticatedSessionController::class, 'destroy'])->name('school.logout');

    Route::inertia('dashboard', 'school/dashboard')->name('school.dashboard');

    Route::resource('teachers', TeacherController::class)->only(['index', 'store', 'update', 'destroy']);
});

require __DIR__.'/settings.php';
