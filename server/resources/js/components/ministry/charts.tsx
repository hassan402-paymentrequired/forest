import type { PieSectorShapeProps } from 'recharts';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceDot,
    ResponsiveContainer,
    Sector,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

/** One hue for one series: identity comes from the chart's title, not colour. */
const SERIES = 'var(--chart-1)';
const AXIS_TEXT = { fill: 'var(--muted-foreground)', fontSize: 12 };

/**
 * A small, fixed-order categorical set for charts where every slice is
 * compared against every other at once (a donut, not a stack) — validated
 * together (CVD-safe order, contrast, chroma) against both surfaces. Keep
 * the order fixed; a 5th category folds into "Other", it never cycles back
 * to slot 1.
 */
const SERIES_SET = [
    'var(--series-1)',
    'var(--series-2)',
    'var(--series-3)',
    'var(--series-4)',
];

export type Point = { label: string; value: number; note?: string };

/**
 * Horizontal bars for comparing categories: the value sits at the bar's tip
 * and the same figures are plain text, so nothing depends on colour or hover.
 * Bars are thin, square at the baseline and rounded at the data end.
 */
export function BarList({
    rows,
    max,
    format = (value) => value.toLocaleString(),
    emptyLabel = 'Nothing recorded yet.',
    className,
}: {
    rows: { label: string; value: number; note?: string }[];
    /** The value a full bar represents; defaults to the largest row. */
    max?: number;
    format?: (value: number) => string;
    emptyLabel?: string;
    className?: string;
}) {
    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
    }

    const scale = max ?? Math.max(...rows.map((row) => row.value), 1);

    return (
        <ul className={cn('grid gap-2.5', className)}>
            {rows.map((row) => (
                <li
                    key={row.label}
                    className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm"
                    title={`${row.label}: ${format(row.value)}${row.note ? ` (${row.note})` : ''}`}
                >
                    <span className="truncate">{row.label}</span>
                    <span className="bg-muted/60 flex h-3 items-center rounded-r-[4px]">
                        <span
                            className="h-3 rounded-r-[4px] transition-opacity hover:opacity-80"
                            style={{
                                width: `${Math.min(Math.max((row.value / scale) * 100, 0), 100)}%`,
                                background: SERIES,
                            }}
                        />
                    </span>
                    <span className="text-right font-medium tabular-nums">
                        {format(row.value)}
                        {row.note ? (
                            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                                {row.note}
                            </span>
                        ) : null}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function TrendTooltip({
    active,
    payload,
    label,
    format,
}: {
    active?: boolean;
    payload?: { value?: number; payload?: Point }[];
    label?: string;
    format: (value: number) => string;
}) {
    if (!active || !payload?.length) {
        return null;
    }

    const note = payload[0].payload?.note;

    return (
        <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
            <p className="text-muted-foreground mb-1">{label}</p>
            <p className="flex items-center gap-2">
                <span
                    aria-hidden
                    className="h-0.5 w-3 rounded-full"
                    style={{ background: SERIES }}
                />
                <span className="text-sm font-semibold tabular-nums">
                    {format(Number(payload[0].value))}
                </span>
                {note ? (
                    <span className="text-muted-foreground">{note}</span>
                ) : null}
            </p>
        </div>
    );
}

/**
 * A single-series line over time: 2px line, a marker on the latest point,
 * hairline grid, and a crosshair tooltip. The data is also rendered as a
 * screen-reader table.
 */
export function TrendChart({
    data,
    caption,
    domain,
    format = (value) => value.toLocaleString(),
    height = 220,
}: {
    data: Point[];
    caption: string;
    domain?: [number, number];
    format?: (value: number) => string;
    height?: number;
}) {
    if (data.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No data recorded for this period yet.
            </p>
        );
    }

    const last = data[data.length - 1];

    return (
        <figure className="flex h-full flex-1 flex-col">
            <div className="min-h-0 flex-1" style={{ minHeight: height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                    >
                        <CartesianGrid
                            vertical={false}
                            stroke="var(--border)"
                            strokeWidth={1}
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
                            domain={domain}
                            tickFormatter={(value) => format(Number(value))}
                            width={48}
                        />
                        <Tooltip
                            cursor={{ stroke: 'var(--border)' }}
                            content={<TrendTooltip format={format} />}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={SERIES}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            dot={false}
                            activeDot={{
                                r: 4,
                                fill: SERIES,
                                stroke: 'var(--card)',
                                strokeWidth: 2,
                            }}
                            isAnimationActive={false}
                        />
                        <ReferenceDot
                            x={last.label}
                            y={last.value}
                            r={4}
                            fill={SERIES}
                            stroke="var(--card)"
                            strokeWidth={2}
                            ifOverflow="visible"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <table className="sr-only">
                <caption>{caption}</caption>
                <tbody>
                    {data.map((point) => (
                        <tr key={point.label}>
                            <th scope="row">{point.label}</th>
                            <td>{format(point.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}

export type Column = { label: string; value: number; note?: string };

function ColumnTooltip({
    active,
    payload,
    format,
}: {
    active?: boolean;
    payload?: { payload?: Column }[];
    format: (value: number) => string;
}) {
    if (!active || !payload?.length || !payload[0].payload) {
        return null;
    }

    const column = payload[0].payload;

    return (
        <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
            <p className="text-muted-foreground mb-1">{column.label}</p>
            <p className="flex items-center gap-2">
                <span
                    aria-hidden
                    className="size-2 rounded-[2px]"
                    style={{ background: SERIES }}
                />
                <span className="text-sm font-semibold tabular-nums">
                    {format(column.value)}
                </span>
                {column.note ? (
                    <span className="text-muted-foreground">{column.note}</span>
                ) : null}
            </p>
        </div>
    );
}

/**
 * A single-series column chart for comparing categories: thin bars (<=24px),
 * rounded at the tip and square at the baseline, with a per-bar hover
 * tooltip. The data is also rendered as a screen-reader table.
 */
export function ColumnChart({
    data,
    caption,
    domain,
    format = (value) => value.toLocaleString(),
    height = 260,
}: {
    data: Column[];
    caption: string;
    domain?: [number, number];
    format?: (value: number) => string;
    height?: number;
}) {
    if (data.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No data recorded for this period yet.
            </p>
        );
    }

    return (
        <figure>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
                    >
                        <CartesianGrid
                            vertical={false}
                            stroke="var(--border)"
                            strokeWidth={1}
                        />
                        <XAxis
                            dataKey="label"
                            tick={AXIS_TEXT}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--border)' }}
                            interval={0}
                            angle={data.length > 6 ? -20 : 0}
                            textAnchor={data.length > 6 ? 'end' : 'middle'}
                            height={data.length > 6 ? 44 : 24}
                        />
                        <YAxis
                            tick={AXIS_TEXT}
                            tickLine={false}
                            axisLine={false}
                            domain={domain}
                            tickFormatter={(value) => format(Number(value))}
                            width={40}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                            content={<ColumnTooltip format={format} />}
                        />
                        <Bar
                            dataKey="value"
                            fill={SERIES}
                            maxBarSize={24}
                            radius={[4, 4, 0, 0]}
                            activeBar={{ fillOpacity: 0.8 }}
                            isAnimationActive={false}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <table className="sr-only">
                <caption>{caption}</caption>
                <tbody>
                    {data.map((column) => (
                        <tr key={column.label}>
                            <th scope="row">{column.label}</th>
                            <td>{format(column.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}

/**
 * A single-series area chart for a trend read as a level building up over
 * time, not just a line: same 2px stroke and marker as `TrendChart`, plus a
 * low-opacity wash under it (never a saturated block). Prefer `TrendChart`
 * when several trends will sit side by side and only their shapes matter;
 * this reads better alone, where the filled area gives it more weight.
 */
export function AreaTrend({
    data,
    caption,
    domain,
    format = (value) => value.toLocaleString(),
    height = 220,
}: {
    data: Point[];
    caption: string;
    domain?: [number, number];
    format?: (value: number) => string;
    height?: number;
}) {
    if (data.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No data recorded for this period yet.
            </p>
        );
    }

    const last = data[data.length - 1];

    return (
        <figure>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                    >
                        <CartesianGrid
                            vertical={false}
                            stroke="var(--border)"
                            strokeWidth={1}
                        />
                        <XAxis
                            dataKey="label"
                            tick={AXIS_TEXT}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--border)' }}
                            interval={0}
                            angle={data.length > 6 ? -20 : 0}
                            textAnchor={data.length > 6 ? 'end' : 'middle'}
                            height={data.length > 6 ? 44 : 24}
                        />
                        <YAxis
                            tick={AXIS_TEXT}
                            tickLine={false}
                            axisLine={false}
                            domain={domain}
                            tickFormatter={(value) => format(Number(value))}
                            width={48}
                        />
                        <Tooltip
                            cursor={{ stroke: 'var(--border)' }}
                            content={<TrendTooltip format={format} />}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={SERIES}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill={SERIES}
                            fillOpacity={0.12}
                            dot={false}
                            activeDot={{
                                r: 4,
                                fill: SERIES,
                                stroke: 'var(--card)',
                                strokeWidth: 2,
                            }}
                            isAnimationActive={false}
                        />
                        <ReferenceDot
                            x={last.label}
                            y={last.value}
                            r={4}
                            fill={SERIES}
                            stroke="var(--card)"
                            strokeWidth={2}
                            ifOverflow="visible"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <table className="sr-only">
                <caption>{caption}</caption>
                <tbody>
                    {data.map((point) => (
                        <tr key={point.label}>
                            <th scope="row">{point.label}</th>
                            <td>{format(point.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}

export type Slice = { label: string; value: number };

function shareOf(slices: Slice[], value: number): number {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    return total > 0 ? Math.round((value / total) * 100) : 0;
}

function DonutTooltip({
    active,
    payload,
    slices,
}: {
    active?: boolean;
    payload?: { payload?: Slice & { fill?: string } }[];
    slices: Slice[];
}) {
    if (!active || !payload?.length || !payload[0].payload) {
        return null;
    }

    const slice = payload[0].payload;

    return (
        <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
            <p className="flex items-center gap-2">
                <span
                    aria-hidden
                    className="size-2 rounded-[2px]"
                    style={{ background: slice.fill }}
                />
                <span className="text-muted-foreground">{slice.label}</span>
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold tabular-nums">
                    {slice.value.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-xs">
                    ({shareOf(slices, slice.value)}%)
                </span>
            </p>
        </div>
    );
}

/**
 * A donut for a small set of categories that add up to a whole (e.g.
 * students by status). Every slice is visible at once, so — unlike the
 * other charts here — it needs a fixed categorical palette and a legend:
 * colour alone never carries identity. The total sits in the centre, where
 * the hole would otherwise be empty.
 */
export function DonutChart({
    data,
    total,
    totalLabel = 'Total',
    height = 220,
}: {
    data: Slice[];
    total?: number;
    totalLabel?: string;
    height?: number;
}) {
    if (data.length === 0 || data.every((slice) => slice.value === 0)) {
        return (
            <p className="text-muted-foreground text-sm">
                Nothing recorded yet.
            </p>
        );
    }

    const grandTotal =
        total ?? data.reduce((sum, slice) => sum + slice.value, 0);

    return (
        <figure className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div
                className="relative mx-auto shrink-0"
                style={{ height, width: height }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip content={<DonutTooltip slices={data} />} />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="label"
                            innerRadius="62%"
                            outerRadius="100%"
                            paddingAngle={2}
                            cornerRadius={3}
                            stroke="var(--card)"
                            strokeWidth={2}
                            isAnimationActive={false}
                            shape={(props) => {
                                const { index, isActive, ...sector } =
                                    props as PieSectorShapeProps;

                                return (
                                    <Sector
                                        {...sector}
                                        fill={
                                            SERIES_SET[
                                                index % SERIES_SET.length
                                            ]
                                        }
                                        fillOpacity={isActive ? 0.85 : 1}
                                    />
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold tabular-nums">
                        {grandTotal.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        {totalLabel}
                    </span>
                </div>
            </div>

            <ul className="grid flex-1 gap-2 text-sm">
                {data.map((slice, index) => (
                    <li
                        key={slice.label}
                        className="flex items-center justify-between gap-3"
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <span
                                aria-hidden
                                className="size-2.5 shrink-0 rounded-[2px]"
                                style={{
                                    background:
                                        SERIES_SET[index % SERIES_SET.length],
                                }}
                            />
                            <span className="truncate">{slice.label}</span>
                        </span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                            {slice.value.toLocaleString()} ·{' '}
                            {shareOf(data, slice.value)}%
                        </span>
                    </li>
                ))}
            </ul>
        </figure>
    );
}
