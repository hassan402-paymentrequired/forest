<?php

use App\Enums\ChatRole;
use App\Models\ChatThread;
use App\Models\School;
use App\Models\SchoolUser;

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('ai.chat'));

    $response->assertRedirect(route('school.login'));
});

test('a school user only sees their own threads', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $ownThread = ChatThread::query()->create(['school_id' => $school->id, 'school_user_id' => $schoolUser->id, 'title' => 'Mine']);

    $otherUser = SchoolUser::factory()->for($school)->create();
    ChatThread::query()->create(['school_id' => $school->id, 'school_user_id' => $otherUser->id, 'title' => 'Not mine']);

    $response = $this->actingAs($schoolUser, 'school')->get(route('ai.chat'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('threads', 1)
        ->where('threads.0.id', $ownThread->id));
});

test('the authenticated school user is shared with every Inertia page, for the docked assistant panel to key off', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('auth.school.id', $schoolUser->id));
});

test('a school user can start a new thread', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.store'));

    $thread = ChatThread::withoutGlobalScopes()->sole();
    expect($thread->school_user_id)->toBe($schoolUser->id);
    $response->assertRedirect(route('ai.chat', ['thread' => $thread->id]));
});

test('a school user can remove their own thread', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $thread = ChatThread::query()->create(['school_id' => $school->id, 'school_user_id' => $schoolUser->id]);

    $response = $this->actingAs($schoolUser, 'school')->delete(route('ai.chat.threads.destroy', $thread));

    $response->assertRedirect(route('ai.chat'));
    expect(ChatThread::withoutGlobalScopes()->find($thread->id))->toBeNull();
});

test('a school user cannot remove another user\'s thread', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $otherUser = SchoolUser::factory()->for($school)->create();
    $otherThread = ChatThread::query()->create(['school_id' => $school->id, 'school_user_id' => $otherUser->id]);

    $response = $this->actingAs($schoolUser, 'school')->delete(route('ai.chat.threads.destroy', $otherThread));

    $response->assertNotFound();
    expect(ChatThread::withoutGlobalScopes()->find($otherThread->id))->not->toBeNull();
});

test('sending a message persists the user message and streams back a reply', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $thread = ChatThread::query()->create(['school_id' => $school->id, 'school_user_id' => $schoolUser->id]);

    $response = $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.respond', $thread), [
        'content' => 'Is Izu on leave?',
    ]);

    $response->assertOk();
    $streamed = $response->streamedContent();
    expect($streamed)->not->toBeEmpty();

    $messages = $thread->messages()->get();
    expect($messages)->toHaveCount(2);
    expect($messages->first()->role)->toBe(ChatRole::User);
    expect($messages->first()->content)->toBe('Is Izu on leave?');
    expect($messages->last()->role)->toBe(ChatRole::Assistant);
    expect($messages->last()->content)->toBe($streamed);

    expect($thread->fresh()->title)->toBe('Is Izu on leave?');
});

test('a school user cannot send a message to another user\'s thread', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $otherUser = SchoolUser::factory()->for($school)->create();
    $otherThread = ChatThread::query()->create(['school_id' => $school->id, 'school_user_id' => $otherUser->id]);

    $response = $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.respond', $otherThread), [
        'content' => 'Hello',
    ]);

    $response->assertNotFound();
    expect($otherThread->messages()->count())->toBe(0);
});
