import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://branch-ai.vercel.app'),
  title: 'BRANCH — Explore the decision before you make it.',
  description: 'BRANCH turns complex real-world decisions into interactive models of options, assumptions, risks, and scenarios.',
  applicationName: 'BRANCH',
  keywords: ['decision intelligence', 'decision simulation', 'scenario planning', 'AI decision support', 'what-if analysis'],
  openGraph: {
    title: 'BRANCH — Explore the decision before you make it.',
    description: 'Model uncertainty. Test assumptions. Explore what could happen.',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
