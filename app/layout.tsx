import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chapball - Real-Time Multiplayer Laser Arena',
  description: 'Clean, fast, competitive multiplayer strategy game.',
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
