'use client';

// This layout removes the max-width constraint for the docs editor
// to allow the full-width document + AI sidebar layout
export default function DocsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
