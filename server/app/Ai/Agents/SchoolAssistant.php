<?php

namespace App\Ai\Agents;

use App\Ai\Query\QueryRunner;
use App\Ai\Query\QueryScope;
use App\Ai\Query\SchemaCatalog;
use App\Ai\Tools\AskClarifyingQuestion;
use App\Ai\Tools\RenderChart;
use App\Ai\Tools\RenderList;
use App\Ai\Tools\RenderTable;
use App\Ai\Tools\RunSqlQuery;
use Laravel\Ai\Attributes\MaxSteps;
use Laravel\Ai\Attributes\Timeout;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasProviderOptions;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * Answers questions about a school's live data by writing its own SELECT
 * queries and choosing how to present the result (chart, table, list, or a
 * clarifying question). What it can see is decided by the `QueryScope` it is
 * built with: the database enforces that scope, not the model.
 *
 * Conversation history is persisted automatically by `RemembersConversations`
 * — the caller just needs to call `continue($conversationId, as: $user)`
 * before prompting or streaming.
 */
#[MaxSteps(8)]
#[Timeout(180)]
class SchoolAssistant implements Agent, Conversational, HasProviderOptions, HasTools
{
    use Promptable, RemembersConversations;

    public function __construct(private QueryScope $scope) {}

    /**
     * Ollama defaults suit chat, not tool-calling over a schema: its 4k
     * context would silently truncate the schema prompt, and Qwen's
     * thinking mode adds a slow reasoning pass to every step.
     *
     * @return array<string, mixed>
     */
    public function providerOptions(Lab|string $provider): array
    {
        return $provider === Lab::Ollama || $provider === 'ollama'
            ? ['think' => false, 'keep_alive' => '30m', 'num_ctx' => 12288]
            : [];
    }

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        $today = now()->toFormattedDayDateString();
        $schema = app(SchemaCatalog::class)->describe($this->scope);

        return <<<PROMPT
        You are the data assistant for an education management platform. Today is {$today}.
        You answer questions about students, teachers, classes, attendance and grades using live data from the database.

        How to work:
        1. Never guess or invent data. Every number, name or date in your answer must come from a query result.
        2. Write ONE PostgreSQL SELECT using only the tables and columns in the schema below, and run it with run_sql_query.
        3. If the query returns an error, read it, fix the SQL and try again.
        4. If the question is ambiguous or you are missing something you need (which term? which class?), call ask_clarifying_question instead of guessing.
        5. Present results with the best display tool, then add one short sentence of insight:
           - render_chart to compare categories or show a trend,
           - render_table for records with several attributes,
           - render_list for a short list of names or values,
           - plain text for a single number or a yes/no answer.
        6. Never show ids (the long lowercase codes in id columns) to the user; use names, and leave id columns out of tables.
        7. Prefer aggregates (COUNT, AVG, GROUP BY) over listing many rows. Results are capped, so say so if a result is marked truncated.
        8. If a query returns no rows, say that nothing was found rather than assuming why.
        9. You can only read data. If asked to change anything, explain that you can't and point them to the relevant page in the platform.
        Be concise and professional.

        SCHEMA
        {$schema}
        PROMPT;
    }

    /**
     * Get the tools available to the agent.
     *
     * @return list<Tool>
     */
    public function tools(): iterable
    {
        return [
            new RunSqlQuery($this->scope, app(QueryRunner::class)),
            new RenderChart,
            new RenderTable,
            new RenderList,
            new AskClarifyingQuestion,
        ];
    }
}
