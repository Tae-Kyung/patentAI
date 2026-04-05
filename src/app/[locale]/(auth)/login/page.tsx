'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const t = useTranslations()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error(t('auth.emailRequired'))
      return
    }
    if (!password) {
      toast.error(t('auth.passwordRequired'))
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error.message, error.status)
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    toast.success(t('auth.loginSuccess'))

    // 역할에 따라 리다이렉트
    const { data: { user: loggedInUser } } = await supabase.auth.getUser()
    if (loggedInUser) {
      const { data: profile } = await supabase
        .from('bi_users')
        .select('role, is_approved')
        .eq('id', loggedInUser.id)
        .single()

      // 미승인 사용자는 승인 대기 페이지로
      if (profile && !profile.is_approved) {
        router.push('/pending-approval')
        return
      }

      if (profile?.role === 'admin') {
        router.push('/admin')
      } else if (profile?.role === 'institution') {
        router.push('/institution/dashboard')
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.login')}</CardTitle>
          <CardDescription>
            {t('auth.noAccount')}{' '}
            <Link href="/signup" className="text-primary hover:underline">
              {t('auth.signup')}
            </Link>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('auth.login')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
