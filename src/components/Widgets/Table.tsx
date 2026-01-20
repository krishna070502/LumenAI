'use client';

import React from 'react';

type TableProps = {
    title?: string;
    headers: string[];
    rows: (string | number | boolean)[][];
    footer?: string;
};

const Table = ({ title, headers = [], rows = [], footer }: TableProps) => {
    if (!Array.isArray(headers) || !Array.isArray(rows) || rows.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col space-y-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {title && (
                <h3 className="text-lg font-semibold text-black dark:text-white px-1">
                    {title}
                </h3>
            )}
            <div className="overflow-x-auto rounded-xl border border-light-200 dark:border-dark-200 bg-white dark:bg-dark-secondary shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-light-100 dark:bg-dark-100/50">
                            {headers.map((header, idx) => (
                                <th
                                    key={idx}
                                    className="px-4 py-3 font-semibold text-black dark:text-white border-b border-light-200 dark:border-dark-200 whitespace-nowrap"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className="group hover:bg-light-100/30 dark:hover:bg-dark-100/10 transition-colors"
                            >
                                {row.map((cell, cellIdx) => (
                                    <td
                                        key={cellIdx}
                                        className="px-4 py-3 text-black/80 dark:text-white/80 border-b border-light-200 dark:border-dark-200 group-last:border-none"
                                    >
                                        {String(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {footer && (
                <p className="text-xs text-black/50 dark:text-white/50 italic px-1">
                    {footer}
                </p>
            )}
        </div>
    );
};

export default Table;
