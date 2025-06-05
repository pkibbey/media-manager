import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import './globals.css';
import { DialogMediaLightbox } from '@/components/media/dialog-media-lightbox';
import { Toaster } from '@/components/ui/sonner';
import { MediaLightboxProvider } from '@/contexts/media-lightbox-context';
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
        <MediaLightboxProvider>
          <main className="flex-1">{children}</main>
          <DialogMediaLightbox />
          <Toaster />
        </MediaLightboxProvider>
      </body>
    </html>
  );
}
