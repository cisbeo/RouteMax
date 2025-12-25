import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://routemax.app';

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'RouteMax - Optimisez vos tournées commerciales',
    template: '%s | RouteMax',
  },
  description:
    'Économisez 2+ heures par semaine en optimisant automatiquement vos tournées commerciales. Sélectionnez et ordonnez les meilleurs clients à visiter avec RouteMax.',
  keywords: [
    'optimisation tournées',
    'planification route',
    'VRP',
    'tournée commerciale',
    'optimisation itinéraire',
    'routage commercial',
  ],
  authors: [{ name: 'RouteMax' }],
  creator: 'RouteMax',
  publisher: 'RouteMax',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteUrl,
    siteName: 'RouteMax',
    title: 'RouteMax - Optimisez vos tournées commerciales en quelques clics',
    description:
      'Économisez 2+ heures par semaine en optimisant automatiquement vos tournées commerciales.',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'RouteMax - Optimisation de tournées commerciales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RouteMax - Optimisez vos tournées commerciales',
    description: 'Économisez 2+ heures par semaine avec RouteMax',
    images: [`${siteUrl}/twitter-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    // Add your verification codes here
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  alternates: {
    canonical: siteUrl,
  },
};
