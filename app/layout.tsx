import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Empire - Центральная система управления',
  description: 'Фрактальная система управления группой бизнесов',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
