import ThemeProvider from '@/components/theme/Provider';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth pages render without the sidebar
    return (
        <ThemeProvider>
            {children}
        </ThemeProvider>
    );
}
