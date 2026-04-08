import { setRequestLocale } from 'next-intl/server'

interface AuthLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AuthLayout({
  children,
  params,
}: AuthLayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <>{children}</>
}
