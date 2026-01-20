import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Do-Talk',
    description: 'Offline Speech Recognition',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
