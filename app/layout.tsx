import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { ClerkProvider } from '@clerk/nextjs'
import { LumensProvider } from '@/lib/lumens-context'
import './globals.css'

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Peerly — AI-Augmented Collaborative Knowledge Mapping',
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
      variables: {
        colorBackground: '#111111',
        colorInputBackground: '#1a1a1a',
        colorInputText: '#f9fafb',
        colorText: '#f9fafb',
        colorTextSecondary: '#9ca3af',
        colorPrimary: '#22C55E',
        colorNeutral: '#ffffff',
        colorShimmer: '#1f1f1f',
      },
      elements: {
        card: 'bg-[#111111] border border-[#1f1f1f] shadow-xl',
        headerTitle: 'text-white',
        headerSubtitle: 'text-gray-400',
        socialButtonsBlockButton: 'bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#222222]',
        dividerLine: 'bg-[#2a2a2a]',
        dividerText: 'text-gray-500',
        formFieldLabel: 'text-gray-300',
        formFieldInput: 'bg-[#1a1a1a] border-[#2a2a2a] text-white',
        footerActionLink: 'text-[#22C55E] hover:text-[#16a34a]',
        identityPreviewText: 'text-white',
        identityPreviewEditButton: 'text-[#22C55E]',
      },
    }}>
      <html lang="en" className="dark">
        <body className={`${lexend.variable} font-sans antialiased`}>
          <LumensProvider>
            {children}
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
