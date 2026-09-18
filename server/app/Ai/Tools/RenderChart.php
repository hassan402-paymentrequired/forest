<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

/**
 * Display tools do no work themselves: the chat UI draws the visual from
 * the arguments the model passes. They return a short acknowledgement so
 * the model knows it was shown and can finish with a sentence of summary.
 */
class RenderChart implements Tool
{
    public function name(): string
    {
        return 'render_chart';
    }

    public function description(): Stringable|string
    {
        return 'Show the user a chart. Use it when comparing categories or showing a trend over time. '
            .'"labels" and "values" must have the same length. Call run_sql_query first to get the data.';
    }

    public function handle(Request $request): Stringable|string
    {
        if (count($request->array('labels')) !== count($request->array('values'))) {
            return 'Error: "labels" and "values" must have the same number of items.';
        }

        return 'The chart is now displayed to the user. Do not repeat its data; add one short sentence of insight.';
    }

    /**
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'chart_type' => $schema->string()->enum(['bar', 'line', 'pie'])->required(),
            'title' => $schema->string()->required(),
            'labels' => $schema->array()->items($schema->string())
                ->description('The category or x-axis labels.')->required(),
            'values' => $schema->array()->items($schema->number())
                ->description('One number per label.')->required(),
        ];
    }
}
