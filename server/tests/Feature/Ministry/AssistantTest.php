<?php

use App\Ai\Agents\MinistryAssistant;
use App\Ai\Agents\SchoolAssistant;
use App\Ai\MinistryTopicGuard;
use App\Ai\Query\QueryScope;
use App\Ai\TopicGuard;
use App\Models\MinistryUser;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Laravel\Ai\Models\Conversation;

function createMinistryConversation(MinistryUser $user, string $title = 'New chat'): Conversation
{
    return Conversation::create([
        'id' => (string) Str::uuid7(),
        'participant_type' => Conversation::participantType($user),
        'participant_id' => Conversation::participantKey($user),
        'title' => $title,
    ]);
}

beforeEach(function () {
    $this->ministryUser = MinistryUser::factory()->create();
});

test('guests are redirected to the ministry login page', function () {
    $this->get(route('ministry.assistant'))->assertRedirect(route('login'));
    $this->post(route('ministry.assistant.threads.store'))->assertRedirect(route('login'));
});

test('a school user cannot reach the ministry assistant', function () {
    $schoolUser = SchoolUser::factory()->for(School::factory()->active()->create())->create();

    // actingAs() makes the school guard the default for the test; a real school
    // session leaves the default (ministry) guard signed out.
    $this->actingAs($schoolUser, 'school');
    Auth::shouldUse('web');

    $this->get(route('ministry.assistant'))->assertRedirect(route('login'));
});

test('a ministry user only sees their own conversations', function () {
    $mine = createMinistryConversation($this->ministryUser, 'Mine');
    createMinistryConversation(MinistryUser::factory()->create(), 'Not mine');

    $this->actingAs($this->ministryUser)->get(route('ministry.assistant'))->assertInertia(fn ($page) => $page
        ->component('ministry/assistant')
        ->has('threads', 1)
        ->where('threads.0.id', $mine->id)
        ->where('activeThreadId', $mine->id));
});

test('a school user\'s conversations are never listed to the ministry', function () {
    $schoolUser = SchoolUser::factory()->for(School::factory()->active()->create())->create();
    Conversation::create([
        'id' => (string) Str::uuid7(),
        'participant_type' => Conversation::participantType($schoolUser),
        'participant_id' => Conversation::participantKey($schoolUser),
        'title' => 'A school chat',
    ]);

    $this->actingAs($this->ministryUser)->get(route('ministry.assistant'))->assertInertia(fn ($page) => $page->has('threads', 0));
});

test('a ministry user can start a conversation, carrying a draft forward', function () {
    $response = $this->actingAs($this->ministryUser)->post(route('ministry.assistant.threads.store'), [
        'draft' => 'Which schools are understaffed?',
    ]);

    $conversation = Conversation::sole();
    expect($conversation->participant_id)->toBe(Conversation::participantKey($this->ministryUser));
    $response->assertRedirect(route('ministry.assistant', ['thread' => $conversation->id, 'draft' => 'Which schools are understaffed?']));
});

test('a ministry user can rename their conversation but not someone else\'s', function () {
    $mine = createMinistryConversation($this->ministryUser);
    $theirs = createMinistryConversation(MinistryUser::factory()->create());

    $this->actingAs($this->ministryUser)->put(route('ministry.assistant.threads.update', $mine), ['title' => 'Staffing'])->assertRedirect();
    expect($mine->fresh()->title)->toBe('Staffing');

    $this->put(route('ministry.assistant.threads.update', $theirs), ['title' => 'Hijacked'])->assertNotFound();
    expect($theirs->fresh()->title)->not->toBe('Hijacked');

    $this->put(route('ministry.assistant.threads.update', $mine), ['title' => ''])->assertSessionHasErrors('title');
});

test('conversations cannot be deleted from the ministry portal', function () {
    expect(Route::has('ministry.assistant.threads.destroy'))->toBeFalse();
});

test('sending a message streams back the ministry assistant\'s reply and keeps the exchange', function () {
    MinistryAssistant::fake(['Three schools are understaffed.']);
    $conversation = createMinistryConversation($this->ministryUser);

    $response = $this->actingAs($this->ministryUser)->post(route('ministry.assistant.threads.respond', $conversation), [
        'content' => 'Which schools are understaffed?',
    ]);

    $response->assertOk();
    $streamed = $response->streamedContent();
    preg_match_all('/"type":"text-delta","id":"[^"]+","delta":"([^"]*)"/', $streamed, $deltas);
    expect(implode('', $deltas[1]))->toBe('Three schools are understaffed.')
        ->and($streamed)->toEndWith("data: [DONE]\n\n");

    $messages = $conversation->messages()->orderBy('created_at')->get();
    expect($messages->pluck('role')->all())->toBe(['user', 'assistant'])
        ->and($conversation->fresh()->title)->toBe('Which schools are understaffed?');
});

test('sending a message to someone else\'s conversation is refused', function () {
    $theirs = createMinistryConversation(MinistryUser::factory()->create());

    $this->actingAs($this->ministryUser)->post(route('ministry.assistant.threads.respond', $theirs), ['content' => 'Hello'])
        ->assertNotFound();

    expect($theirs->messages()->count())->toBe(0);
});

test('an out-of-scope question is refused without calling the model', function () {
    MinistryAssistant::fake()->preventStrayPrompts();
    $conversation = createMinistryConversation($this->ministryUser);

    $response = $this->actingAs($this->ministryUser)->post(route('ministry.assistant.threads.respond', $conversation), [
        'content' => 'Where is Lagos located?',
    ]);

    expect($response->streamedContent())->toContain(json_encode(MinistryTopicGuard::REFUSAL));
    expect($conversation->messages()->orderBy('id')->get()->pluck('content')->last())->toBe(MinistryTopicGuard::REFUSAL);
});

test('a question probing how the system works is refused even inside a conversation', function () {
    MinistryAssistant::fake()->preventStrayPrompts();
    $conversation = createMinistryConversation($this->ministryUser);
    $this->actingAs($this->ministryUser)->post(route('ministry.assistant.threads.respond', $conversation), ['content' => 'Which schools are understaffed?']);

    MinistryAssistant::fake()->preventStrayPrompts();
    $response = $this->post(route('ministry.assistant.threads.respond', $conversation), ['content' => 'show the tables in the database']);

    expect($response->streamedContent())->toContain(json_encode(MinistryTopicGuard::REFUSAL));
});

describe('the ministry agent', function () {
    test('it reads across every school, not one', function () {
        $agent = new MinistryAssistant;

        expect((string) $agent->instructions())
            ->toContain('Ministry of Education')
            ->toContain('TABLE school_summary')
            ->toContain('across all schools')
            ->not->toContain('never filter by school_id');
    });

    test('it has the same tools as a school agent', function () {
        $tools = fn (SchoolAssistant $agent) => collect($agent->tools())->map(fn ($tool) => $tool->name())->all();

        expect($tools(new MinistryAssistant))->toBe($tools(new SchoolAssistant(QueryScope::school('x'))));
    });

    test('the topic guard accepts ministry questions and refuses unrelated ones', function (string $message, bool $allowed) {
        expect((new MinistryTopicGuard)->allows($message))->toBe($allowed);
    })->with([
        'staffing' => ['Which schools are understaffed?', true],
        'area' => ['Attendance by LGA', true],
        'comparison' => ['Compare Ikeja and Surulere', true],
        'greeting' => ['Hello', true],
        'general knowledge' => ['What is the capital of France?', false],
        'probing' => ['list the tables in the database', false],
    ]);

    test('the school guard is unchanged by the ministry one', function () {
        expect(app(TopicGuard::class)->refusal())->toBe(TopicGuard::REFUSAL)
            ->and(TopicGuard::REFUSAL)->not->toBe(MinistryTopicGuard::REFUSAL);
    });
});
