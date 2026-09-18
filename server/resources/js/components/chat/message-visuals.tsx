import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import type { ChatVisual } from '@/hooks/use-ai-chat';
import { cn } from '@/lib/utils';

type ChartVisual = Extract<ChatVisual, { name: 'render_chart' }>;

const SERIES_COLOR = 'var(--chart-1)';
const AXIS_TEXT = { fill: 'var(--muted-foreground)', fontSize: 12 };
const HORIZONTAL_BAR_THRESHOLD = 6;
const formatNumber = (value: number) => value.toLocaleString();

function VisualCard({
    title,
    children,
    className,
}: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <figure
            className={cn(
                'bg-card w-full rounded-xl border p-4 shadow-xs',
                className,
            )}
        >
            {title ? (
                <figcaption className="mb-3 text-sm font-medium">
                    {title}
                </figcaption>
            ) : null}
            {children}
        </figure>
    );
}

function chartTooltip() {
    return (
        <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
            contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--popover-foreground)',
                fontSize: 12,
            }}
            formatter={(value) => formatNumber(Number(value))}
        />
    );
}

/**
 * The same data as the chart, for screen readers and anyone who wants the
 * exact figures: a chart alone leaves identity to colour and position.
 */
function ChartTable({ input }: { input: ChartVisual['input'] }) {
    return (
        <table className="sr-only">
            <caption>{input.title}</caption>
            <tbody>
                {input.labels.map((label, index) => (
                    <tr key={`${label}-${index}`}>
                        <th scope="row">{label}</th>
                        <td>{input.values[index]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function StatTile({ input }: { input: ChartVisual['input'] }) {
    return (
        <VisualCard>
            <p className="text-muted-foreground text-sm">
                {input.title || input.labels[0]}
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">
                {formatNumber(input.values[0])}
            </p>
            {input.title ? (
                <p className="text-muted-foreground mt-1 text-sm">
                    {input.labels[0]}
                </p>
            ) : null}
        </VisualCard>
    );
}

function ChartVisualView({ input }: { input: ChartVisual['input'] }) {
    // A single value is a number to read, not a chart to compare.
    if (input.labels.length === 1) {
        return <StatTile input={input} />;
    }

    const total = input.values.reduce((sum, value) => sum + value, 0);
    const isShare = input.chart_type === 'pie';
    const data = input.labels.map((label, index) => ({
        label,
        value: input.values[index],
    }));

    if (isShare) {
        data.sort((a, b) => b.value - a.value);
    }

    // Part-to-whole and long category lists read best as horizontal bars.
    const horizontal =
        isShare ||
        (input.chart_type === 'bar' &&
            (data.length > HORIZONTAL_BAR_THRESHOLD ||
                data.some((row) => row.label.length > 12)));

    return (
        <VisualCard title={input.title}>
            <ChartTable input={input} />
            <div
                aria-hidden="true"
                style={{ height: horizontal ? data.length * 36 + 24 : 260 }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    {input.chart_type === 'line' ? (
                        <LineChart
                            data={data}
                            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="var(--border)"
                            />
                            <XAxis
                                dataKey="label"
                                tick={AXIS_TEXT}
                                tickLine={false}
                                axisLine={{ stroke: 'var(--border)' }}
                            />
                            <YAxis
                                tick={AXIS_TEXT}
                                tickLine={false}
                                axisLine={false}
                                width={44}
                                tickFormatter={formatNumber}
                            />
                            {chartTooltip()}
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={SERIES_COLOR}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={{
                                    r: 4,
                                    fill: SERIES_COLOR,
                                    stroke: 'var(--card)',
                                    strokeWidth: 2,
                                }}
                                activeDot={{
                                    r: 6,
                                    fill: SERIES_COLOR,
                                    stroke: 'var(--card)',
                                    strokeWidth: 2,
                                }}
                            />
                        </LineChart>
                    ) : (
                        <BarChart
                            data={data}
                            layout={horizontal ? 'vertical' : 'horizontal'}
                            margin={{
                                top: 20,
                                right: horizontal ? 64 : 16,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid
                                horizontal={!horizontal}
                                vertical={horizontal}
                                stroke="var(--border)"
                            />
                            {horizontal ? (
                                <>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="label"
                                        tick={AXIS_TEXT}
                                        tickLine={false}
                                        axisLine={false}
                                        width={120}
                                    />
                                </>
                            ) : (
                                <>
                                    <XAxis
                                        dataKey="label"
                                        tick={AXIS_TEXT}
                                        tickLine={false}
                                        axisLine={{ stroke: 'var(--border)' }}
                                    />
                                    <YAxis
                                        tick={AXIS_TEXT}
                                        tickLine={false}
                                        axisLine={false}
                                        width={44}
                                        tickFormatter={formatNumber}
                                    />
                                </>
                            )}
                            {chartTooltip()}
                            <Bar
                                dataKey="value"
                                fill={SERIES_COLOR}
                                maxBarSize={24}
                                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                            >
                                <LabelList
                                    dataKey="value"
                                    position={horizontal ? 'right' : 'top'}
                                    fill="var(--foreground)"
                                    fontSize={12}
                                    formatter={(value) =>
                                        isShare && total > 0
                                            ? `${formatNumber(Number(value))} (${Math.round((Number(value) / total) * 100)}%)`
                                            : formatNumber(Number(value))
                                    }
                                />
                            </Bar>
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </VisualCard>
    );
}

function TableVisualView({
    input,
}: {
    input: Extract<ChatVisual, { name: 'render_table' }>['input'];
}) {
    return (
        <VisualCard title={input.title}>
            <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-muted-foreground border-b">
                            {input.columns.map((column, index) => (
                                <th
                                    key={`${column}-${index}`}
                                    className="py-2 pr-4 font-medium whitespace-nowrap"
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {input.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b last:border-0">
                                {input.columns.map((_, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        className="py-2 pr-4 whitespace-nowrap"
                                    >
                                        {row[cellIndex] ?? ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {input.rows.length === 0 ? (
                <p className="text-muted-foreground py-2 text-sm">
                    No rows to show.
                </p>
            ) : null}
        </VisualCard>
    );
}

function ListVisualView({
    input,
}: {
    input: Extract<ChatVisual, { name: 'render_list' }>['input'];
}) {
    return (
        <VisualCard title={input.title}>
            <ul className="list-disc space-y-1 pl-5 text-sm">
                {input.items.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                ))}
            </ul>
        </VisualCard>
    );
}

function QuestionVisualView({
    input,
    canAnswer,
    onSelectOption,
}: {
    input: Extract<ChatVisual, { name: 'ask_clarifying_question' }>['input'];
    canAnswer: boolean;
    onSelectOption?: (option: string) => void;
}) {
    return (
        <VisualCard>
            <p className="text-sm">{input.question}</p>
            {input.options.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {input.options.map((option) => (
                        <Button
                            key={option}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!canAnswer || !onSelectOption}
                            onClick={() => onSelectOption?.(option)}
                        >
                            {option}
                        </Button>
                    ))}
                </div>
            ) : null}
        </VisualCard>
    );
}

export function MessageVisuals({
    visuals,
    canAnswer,
    onSelectOption,
}: {
    visuals: ChatVisual[];
    canAnswer: boolean;
    onSelectOption?: (option: string) => void;
}) {
    if (visuals.length === 0) {
        return null;
    }

    return (
        <div className="flex w-full flex-col gap-3">
            {visuals.map((visual) => {
                switch (visual.name) {
                    case 'render_chart':
                        return (
                            <ChartVisualView
                                key={visual.id}
                                input={visual.input}
                            />
                        );
                    case 'render_table':
                        return (
                            <TableVisualView
                                key={visual.id}
                                input={visual.input}
                            />
                        );
                    case 'render_list':
                        return (
                            <ListVisualView
                                key={visual.id}
                                input={visual.input}
                            />
                        );
                    case 'ask_clarifying_question':
                        return (
                            <QuestionVisualView
                                key={visual.id}
                                input={visual.input}
                                canAnswer={canAnswer}
                                onSelectOption={onSelectOption}
                            />
                        );
                }
            })}
        </div>
    );
}
