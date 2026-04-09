import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { ClerkProvider } from '@clerk/nextjs'
import { LumensProvider } from '@/lib/lumens-context'
import { CurrentUserProvider } from '@/hooks/use-current-user'
import './globals.css'
import { dark, shadcn } from '@clerk/ui/themes'

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Loom - From chaos to clarity',
  description: 'Build and explore collaborative knowledge weaves with AI-powered scaffolding.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider appearance={{
      theme: shadcn,
      elements: {
        formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 h-11',
      },
    }}>
      <html lang="en" className="dark">
        <body className={`${lexend.variable} font-sans antialiased`}>
          <LumensProvider>
            <CurrentUserProvider>
            {children}
          </CurrentUserProvider>
          </LumensProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#111111',
                border: '1px solid #1F1F1F',
                color: '#F9FAFB',
              },
            }}
          />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}