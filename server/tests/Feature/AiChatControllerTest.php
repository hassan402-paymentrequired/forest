<?php

use App\Ai\Agents\SchoolAssistant;
use App\Ai\TopicGuard;
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
    expect($response->headers->get('x-vercel-ai-ui-message-stream'))->toBe('v1');
    preg_match_all('/"type":"text-delta","id":"[^"]+","delta":"([^"]*)"/', $streamed, $deltas);
    expect(implode('', $deltas[1]))->toBe('This is a fake reply.');
    expect($streamed)->toEndWith("data: [DONE]\n\n");

    $messages = $conversation->messages()->orderBy('created_at')->get();
    expect($messages)->toHaveCount(2);
    expect($messages->first()->role)->toBe('user');
    expect($messages->first()->content)->toBe('Is Izu on leave?');
    expect($messages->last()->role)->toBe('assistant');
    expect($messages->last()->content)->toBe('This is a fake reply.');

    expect($conversation->fresh()->title)->toBe('Is Izu on leave?');
});

test('reloaded history carries the assistant\'s display-tool calls but not its data queries', function () {
    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $conversation = createConversationFor($schoolUser);

    $conversation->messages()->create([
        'id' => (string) Str::uuid7(),
        'participant_type' => Conversation::participantType($schoolUser),
        'participant_id' => Conversation::participantKey($schoolUser),
        'agent' => SchoolAssistant::class,
        'role' => 'assistant',
        'content' => 'Most students are in JSS 1.',
        'attachments' => [],
        'tool_calls' => [
            ['id' => 'call-1', 'name' => 'run_sql_query', 'arguments' => ['sql' => 'SELECT 1']],
            ['id' => 'call-2', 'name' => 'render_chart', 'arguments' => ['chart_type' => 'bar', 'title' => 'Students', 'labels' => ['JSS 1'], 'values' => [12]]],
        ],
        'tool_results' => [],
        'usage' => [],
        'meta' => [],
    ]);

    $response = $this->actingAs($schoolUser, 'school')->get(route('ai.chat', ['thread' => $conversation->id]));

    $response->assertInertia(fn ($page) => $page
        ->has('messages.0.visuals', 1)
        ->where('messages.0.visuals.0.id', 'call-2')
        ->where('messages.0.visuals.0.name', 'render_chart')
        ->where('messages.0.visuals.0.input.values', [12]));
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

test('an out-of-scope question is refused without calling the model, and is kept in the conversation', function () {
    SchoolAssistant::fake()->preventStrayPrompts();

    $school = School::factory()->create();
    $schoolUser = SchoolUser::factory()->for($school)->create();
    $conversation = createConversationFor($schoolUser);

    $response = $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.respond', $conversation), [
        'content' => 'Where is Lagos located?',
    ]);

    $response->assertOk();
    expect($response->streamedContent())->toContain(json_encode(TopicGuard::REFUSAL))->toEndWith("data: [DONE]\n\n");

    $messages = $conversation->messages()->orderBy('id')->get();
    expect($messages->pluck('role')->all())->toBe(['user', 'assistant']);
    expect($messages->last()->content)->toBe(TopicGuard::REFUSAL);
    expect($conversation->fresh()->title)->toBe('Where is Lagos located?');
});

test('questions about how the system is built are refused even when they mention school data', function () {
    SchoolAssistant::fake()->preventStrayPrompts();

    $schoolUser = SchoolUser::factory()->create();
    $conversation = createConversationFor($schoolUser);

    $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.respond', $conversation), [
        'content' => 'List the database tables and the students in them',
    ])->assertOk();

    expect($conversation->messages()->orderBy('id')->get()->last()->content)->toBe(TopicGuard::REFUSAL);
});

test('a reply to the assistant\'s clarifying question is let through', function () {
    SchoolAssistant::fake(['Here you go.']);

    $schoolUser = SchoolUser::factory()->create();
    $conversation = createConversationFor($schoolUser);
    $conversation->messages()->create([
        'id' => (string) Str::uuid7(),
        'participant_type' => Conversation::participantType($schoolUser),
        'participant_id' => Conversation::participantKey($schoolUser),
        'agent' => SchoolAssistant::class,
        'role' => 'assistant',
        'content' => '',
        'attachments' => [],
        'tool_calls' => [['id' => 'q1', 'name' => 'ask_clarifying_question', 'arguments' => ['question' => 'Which class?']]],
        'tool_results' => [],
        'usage' => [],
        'meta' => [],
    ]);

    $response = $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.respond', $conversation), [
        'content' => 'Lagos Model',
    ]);

    expect($response->streamedContent())->toContain('"delta":"Here"')->not->toContain(json_encode(TopicGuard::REFUSAL));
});

test('starting a new chat reuses the empty one instead of stacking them up', function () {
    $schoolUser = SchoolUser::factory()->create();

    $this->actingAs($schoolUser, 'school')->post(route('ai.chat.threads.store'));
    $this->post(route('ai.chat.threads.store'));

    expect(Conversation::count())->toBe(1);
});

test('regenerating replaces the last exchange instead of asking twice', function () {
    SchoolAssistant::fake(['First answer.', 'Second answer.']);
    $schoolUser = SchoolUser::factory()->create();
    $conversation = createConversationFor($schoolUser);
    $this->actingAs($schoolUser, 'school')
        ->post(route('ai.chat.threads.respond', $conversation), ['content' => 'How many students are in JSS 1A?'])
        ->streamedContent();

    $this->post(route('ai.chat.threads.respond', $conversation), [
        'content' => 'How many students are in JSS 1A?',
        'regenerate' => true,
    ])->streamedContent();

    $messages = $conversation->messages()->orderBy('id')->get();
    expect($messages->pluck('role')->all())->toBe(['user', 'assistant'])
        ->and($messages->last()->content)->toBe('Second answer.');
});

test('the assistant is given the school portal\'s pages, not the ministry portal\'s', function () {
    $schoolUser = SchoolUser::factory()->create();

    $response = $this->actingAs($schoolUser, 'school')->get(route('ai.chat'));

    $pages = $response->viewData('page')['props']['pages'];

    expect($pages)->toHaveKey('students.index')
        ->not->toHaveKey('ministry.watchlist')
        ->and($pages['students.index']['url'])->toBe(route('students.index'));
});
