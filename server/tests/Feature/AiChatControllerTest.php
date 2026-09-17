<?php

use App\Ai\Agents\SchoolAssistant;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Support\Str;
use Laravel\Ai\Models\Conversation;

function createConversationFor(SchoolUser $schoolUser, string $title = 'New chat'): Conversation
{
    return Conversation::create([
        'id' => (string) Str::uuid7(),
        'participant_type' => Conversation::participantType($schoolUser),
        'participant_id' => Conversation::participantKey($schoolUser),
        'title' => $title,
    ]);
}

test('guests are redirected to the school login page', function () {
    $response = $this->get(route('ai.chat'));

    $response->assertRedirect(route('school.login'));
});

test('a school user only sees their own conversations', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $ownConversation = createConversationFor($schoolUser, 'Mine');

    $otherUser = SchoolUser::factory()->for($school)->create();
    createConversationFor($otherUser, 'Not mine');

    $response = $this->actingAs($schoolUser, 'school')->get(route('ai.chat'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('threads', 1)
        ->where('threads.0.id', $ownConversation->id));
});

test('a school user can start a new conversation', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.store'));

    $conversation = Conversation::sole();
    expect($conversation->participant_type)->toBe(Conversation::participantType($schoolUser));
    expect($conversation->participant_id)->toBe(Conversation::participantKey($schoolUser));
    $response->assertRedirect(route('ai.chat', ['thread' => $conversation->id]));
});

test('a school user can remove their own conversation', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $conversation = createConversationFor($schoolUser);

    $response = $this->actingAs($schoolUser, 'school')->delete(route('ai.chat.threads.destroy', $conversation));

    $response->assertRedirect(route('ai.chat'));
    expect(Conversation::find($conversation->id))->toBeNull();
});

test('a school user can rename their own conversation', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $conversation = createConversationFor($schoolUser);

    $response = $this->actingAs($schoolUser, 'school')->put(route('ai.chat.threads.update', $conversation), [
        'title' => 'Attendance question',
    ]);

    $response->assertRedirect();
    expect($conversation->fresh()->title)->toBe('Attendance question');
});

test('renaming requires a title', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $conversation = createConversationFor($schoolUser);

    $response = $this->actingAs($schoolUser, 'school')->put(route('ai.chat.threads.update', $conversation), [
        'title' => '',
    ]);

    $response->assertSessionHasErrors('title');
});

test('a school user cannot rename another user\'s conversation', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $otherUser = SchoolUser::factory()->for($school)->create();
    $otherConversation = createConversationFor($otherUser);

    $response = $this->actingAs($schoolUser, 'school')->put(route('ai.chat.threads.update', $otherConversation), [
        'title' => 'Hijacked',
    ]);

    $response->assertNotFound();
    expect($otherConversation->fresh()->title)->not->toBe('Hijacked');
});

test('sending a message never overwrites a title the user has already set', function () {
    SchoolAssistant::fake(['This is a fake reply.']);

    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $conversation = createConversationFor($schoolUser, 'Attendance question');

    $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.respond', $conversation), [
        'content' => 'Is Izu on leave?',
    ]);

    expect($conversation->fresh()->title)->toBe('Attendance question');
});

test('a school user cannot remove another user\'s conversation', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $otherUser = SchoolUser::factory()->for($school)->create();
    $otherConversation = createConversationFor($otherUser);

    $response = $this->actingAs($schoolUser, 'school')->delete(route('ai.chat.threads.destroy', $otherConversation));

    $response->assertNotFound();
    expect(Conversation::find($otherConversation->id))->not->toBeNull();
});

test('sending a message persists the user message and streams back the agent\'s reply', function () {
    SchoolAssistant::fake(['This is a fake reply.']);

    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $conversation = createConversationFor($schoolUser);

    $response = $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.respond', $conversation), [
        'content' => 'Is Izu on leave?',
    ]);

    $response->assertOk();
    $streamed = $response->streamedContent();
    expect($streamed)->toBe('This is a fake reply.');

    $messages = $conversation->messages()->orderBy('created_at')->get();
    expect($messages)->toHaveCount(2);
    expect($messages->first()->role)->toBe('user');
    expect($messages->first()->content)->toBe('Is Izu on leave?');
    expect($messages->last()->role)->toBe('assistant');
    expect($messages->last()->content)->toBe('This is a fake reply.');

    expect($conversation->fresh()->title)->toBe('Is Izu on leave?');
});

test('a school user cannot send a message to another user\'s conversation', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $otherUser = SchoolUser::factory()->for($school)->create();
    $otherConversation = createConversationFor($otherUser);

    $response = $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.respond', $otherConversation), [
        'content' => 'Hello',
    ]);

    $response->assertNotFound();
    expect($otherConversation->messages()->count())->toBe(0);
});

test('the authenticated school user is shared with every Inertia page, for the docked assistant panel to key off', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('students.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('auth.school.id', $schoolUser->id));
});
