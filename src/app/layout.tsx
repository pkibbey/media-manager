import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/ui/navigation/header';
import { Toaster } from '@/components/ui/sonner';
export const metadata: Metadata = {
  title: 'Media Manager',
  description: 'An application to manage and organize your media files',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body
        className={`${GeistSans.className} dark min-h-screen bg-background flex flex-col`}
      >
        <Header />
        <main className="flex-1 px-4">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
