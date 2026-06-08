import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'VantixGrowth Dashboard',
  description: 'Agency management dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn('dark', GeistSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <TooltipProvider delayDuration={0}>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
