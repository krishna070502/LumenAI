'use client';

import React from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

type ChartProps = {
    type: 'line' | 'bar' | 'area';
    title?: string;
    data: any[];
    xAxisKey: string;
    yAxisKeys: string[];
    colors?: string[];
};

const Chart = ({
    type,
    title,
    data = [],
    xAxisKey,
    yAxisKeys = [],
    colors = ['#0ea5e9', '#f43f5e', '#10b981', '#f59e0b'],
}: ChartProps) => {
    if (
        !Array.isArray(data) ||
        data.length === 0 ||
        !Array.isArray(yAxisKeys) ||
        yAxisKeys.length === 0
    ) {
        return null;
    }
    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis
                            dataKey={xAxisKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#888888', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#888888', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--tw-bg-opacity, #ffffff)',
                                borderRadius: '8px',
                                border: '1px solid #88888840',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            cursor={{ fill: '#88888810' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {yAxisKeys.map((key, idx) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                fill={colors[idx % colors.length]}
                                radius={[4, 4, 0, 0]}
                            />
                        ))}
                    </BarChart>
                );
            case 'area':
                return (
                    <AreaChart data={data}>
                        <defs>
                            {yAxisKeys.map((key, idx) => (
                                <linearGradient
                                    key={`grad-${key}`}
                                    id={`color-${key}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={colors[idx % colors.length]}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={colors[idx % colors.length]}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis
                            dataKey={xAxisKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#888888', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#888888', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--tw-bg-opacity, #ffffff)',
                                borderRadius: '8px',
                                border: '1px solid #88888840',
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {yAxisKeys.map((key, idx) => (
                            <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={colors[idx % colors.length]}
                                fillOpacity={1}
                                fill={`url(#color-${key})`}
                                strokeWidth={2}
                            />
                        ))}
                    </AreaChart>
                );
            case 'line':
            default:
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis
                            dataKey={xAxisKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#888888', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#888888', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--tw-bg-opacity, #ffffff)',
                                borderRadius: '8px',
                                border: '1px solid #88888840',
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {yAxisKeys.map((key, idx) => (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={colors[idx % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 4, strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                );
        }
    };

    return (
        <div className="flex flex-col space-y-4 w-full h-80 min-h-[320px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            {title && (
                <h3 className="text-lg font-semibold text-black dark:text-white px-1">
                    {title}
                </h3>
            )}
            <div className="flex-1 w-full rounded-xl border border-light-200 dark:border-dark-200 bg-white dark:bg-dark-secondary p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Chart;
