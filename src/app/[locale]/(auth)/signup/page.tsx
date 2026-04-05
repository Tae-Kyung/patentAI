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
import { isFeatureEnabled } from '@/lib/feature-flags'
import type { UserRole } from '@/types/database'

type SelectableRole = 'user' | 'mentor' | 'institution'

export default function SignupPage() {
  const t = useTranslations()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<SelectableRole>('user')
  const [specialty, setSpecialty] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const multiRoleEnabled = isFeatureEnabled('MULTI_ROLE_SIGNUP')

  const handleNext = () => {
    if (!email) {
      toast.error(t('auth.emailRequired'))
      return
    }
    if (!password) {
      toast.error(t('auth.passwordRequired'))
      return
    }
    if (password.length < 8) {
      toast.error(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'))
      return
    }

    if (multiRoleEnabled && selectedRole !== 'user') {
      setStep(2)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    setIsLoading(true)
    const supabase = createClient()

    const metadata: Record<string, string> = { name }

    if (multiRoleEnabled) {
      metadata.role = selectedRole
      if (selectedRole === 'mentor' && specialty) {
        metadata.specialty = specialty
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    // 멘토/기관 역할인 경우 API로 역할 업데이트 (트리거 의존 제거)
    if (multiRoleEnabled && selectedRole !== 'user' && data.user?.id) {
      try {
        await fetch('/api/auth/post-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id }),
        })
      } catch {
        // 역할 업데이트 실패해도 가입 자체는 성공
      }
    }

    if (multiRoleEnabled && selectedRole !== 'user') {
      toast.success(t('auth.signupPendingApproval'))
      router.push('/pending-approval')
    } else {
      toast.success(t('auth.signupSuccess'))
      router.push('/login')
    }
  }

  const roleOptions: { value: SelectableRole; label: string; desc: string }[] = [
    { value: 'user', label: t('auth.roleUser'), desc: t('auth.roleUserDesc') },
    { value: 'mentor', label: t('auth.roleMentor'), desc: t('auth.roleMentorDesc') },
    { value: 'institution', label: t('auth.roleInstitution'), desc: t('auth.roleInstitutionDesc') },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.signup')}</CardTitle>
          <CardDescription>
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('auth.login')}
            </Link>
          </CardDescription>
        </CardHeader>

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); handleNext() }}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
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
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {multiRoleEnabled && (
                <div className="space-y-3">
                  <Label>{t('auth.selectRole')}</Label>
                  <div className="space-y-2">
                    {roleOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                          ${selectedRole === option.value
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={selectedRole === option.value}
                          onChange={() => setSelectedRole(option.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {option.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {option.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('common.loading') : (multiRoleEnabled && selectedRole !== 'user') ? t('common.next') : t('auth.signup')}
              </Button>
            </CardFooter>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('auth.additionalInfo')}
              </p>

              {selectedRole === 'mentor' && (
                <div className="space-y-2">
                  <Label htmlFor="specialty">{t('auth.specialty')}</Label>
                  <Input
                    id="specialty"
                    type="text"
                    placeholder={t('auth.specialtyPlaceholder')}
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}

              {selectedRole === 'institution' && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('auth.selectInstitution')}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                {t('common.back')}
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? t('common.loading') : t('auth.signup')}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
