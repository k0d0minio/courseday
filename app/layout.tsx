import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Fraunces } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['SOFT', 'opsz'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: "Courseday — Run your golf club's day in one view",
    template: '%s · Courseday',
  },
  description:
    'Courseday is the daily operations platform for golf clubs. Reception, restaurant, and floor staff work from one shared day — no more missed covers or phone calls between teams.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#1f5d3a',
}

function supabaseOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = supabaseOrigin()
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        {supabase && (
          <>
            <link rel="preconnect" href={supabase} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabase} />
          </>
        )}
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
