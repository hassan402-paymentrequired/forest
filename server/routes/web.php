<?php

use App\Http\Controllers\SchoolController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::resource('schools', SchoolController::class)->only(['index', 'store']);
});

require __DIR__.'/settings.php';
