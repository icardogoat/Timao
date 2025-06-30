
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import SessionProviderWrapper from '@/components/session-provider-wrapper';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9003';
const siteTitle = 'Timaocord';
const siteDescription = 'A casa da nação Corinthiana. Participe de bolões, dê palpites, ganhe prêmios e conecte-se com outros torcedores. Aposte com moeda virtual e mostre que você é Fiel!';
const ogImage = 'https://i.imgur.com/T0w3T8q.png';

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  icons: {
    icon: { url: 'https://i.imgur.com/RocHctJ.png', type: 'image/png' },
    shortcut: { url: 'https://i.imgur.com/RocHctJ.png', type: 'image/png' },
    apple: { url: 'https://i.imgur.com/RocHctJ.png', type: 'image/png' },
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: '/',
    siteName: siteTitle,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Banner do Timaocord mostrando o estádio e o logo',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
  themeColor: '#1A1A1A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SessionProviderWrapper>
          {children}
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
