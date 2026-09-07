import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BRANCH — Decision Intelligence',
  description: 'Turn complex decisions into interactive models, scenarios, and explainable trade-offs.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
