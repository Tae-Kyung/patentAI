'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Upload, FileText, Trash2, Check, AlertCircle, User, Lock, Building2, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { locales } from '@/i18n/routing'
import { toast } from 'sonner'

const localeLabels: Record<string, string> = {
  ko: '한국어',
  en: 'English',
}

const roleLabels: Record<string, string> = {
  user: 'User',
  mentor: 'Mentor',
  institution: 'Institution',
  admin: 'Admin',
}

interface MentorDocuments {
  resume: string | null
  bank_account: string | null
  privacy_consent: string | null
  id_card: string | null
}

interface ProfileData {
  id: string
  name: string | null
  email: string
  role: string
}

interface InstitutionData {
  id: string
  name: string
  region: string | null
  type: string
  address: string | null
  contact_email: string | null
  contact_phone: string | null
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const { theme, setTheme } = useTheme()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editName, setEditName] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  // Institution state
  const [institution, setInstitution] = useState<InstitutionData | null>(null)
  const [editInstitution, setEditInstitution] = useState<Partial<InstitutionData>>({})
  const [isSavingInstitution, setIsSavingInstitution] = useState(false)

  // Mentor docs state
  const [isMentor, setIsMentor] = useState(false)
  const [documents, setDocuments] = useState<MentorDocuments | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [deletingType, setDeletingType] = useState<string | null>(null)

  // Account deletion state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // Fetch profile
  useEffect(() => {
    fetch('/api/settings/profile')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setProfile(result.data)
          setEditName(result.data.name || '')
        }
      })
      .catch(() => toast.error(t('profileFetchFailed')))
  }, [])

  // Fetch institution info (only for institution role)
  useEffect(() => {
    if (profile?.role === 'institution') {
      fetch('/api/settings/institution')
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setInstitution(result.data)
            setEditInstitution({
              name: result.data.name,
              contact_email: result.data.contact_email,
              contact_phone: result.data.contact_phone,
              address: result.data.address,
            })
          }
        })
        .catch(() => toast.error(t('institutionFetchFailed')))
    }
  }, [profile?.role])

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/')
    segments[1] = newLocale
    const newPath = segments.join('/')
    router.push(newPath)
  }

  // Profile save
  const handleSaveProfile = async () => {
    if (!editName.trim()) return
    setIsSavingProfile(true)
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const result = await response.json()
      if (result.success) {
        setProfile(prev => prev ? { ...prev, name: editName.trim() } : prev)
        toast.success(t('profileUpdated'))
      } else {
        toast.error(t('profileUpdateFailed'))
      }
    } catch {
      toast.error(t('profileUpdateFailed'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Password change
  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error(t('passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'))
      return
    }
    setIsSavingPassword(true)
    try {
      const response = await fetch('/api/settings/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('passwordChanged'))
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(result.error || t('passwordChangeFailed'))
      }
    } catch {
      toast.error(t('passwordChangeFailed'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  // Institution save
  const handleSaveInstitution = async () => {
    setIsSavingInstitution(true)
    try {
      const response = await fetch('/api/settings/institution', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editInstitution),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('institutionUpdated'))
      } else {
        toast.error(t('institutionUpdateFailed'))
      }
    } catch {
      toast.error(t('institutionUpdateFailed'))
    } finally {
      setIsSavingInstitution(false)
    }
  }

  // Mentor docs
  const fetchMentorDocuments = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const response = await fetch('/api/mentor/documents')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setIsMentor(true)
          setDocuments(result.data)
        }
      }
    } catch {
      // Not a mentor or fetch failed - silent
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    fetchMentorDocuments()
  }, [fetchMentorDocuments])

  const handleUpload = async (docType: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('mentorDocs.fileTooLarge'))
        return
      }

      setUploadingType(docType)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', docType)

        const response = await fetch('/api/mentor/documents', {
          method: 'POST',
          body: formData,
        })
        const result = await response.json()
        if (result.success) {
          toast.success(t('mentorDocs.uploadSuccess'))
          await fetchMentorDocuments()
        } else {
          toast.error(result.error || t('mentorDocs.uploadFailed'))
        }
      } catch {
        toast.error(t('mentorDocs.uploadFailed'))
      } finally {
        setUploadingType(null)
      }
    }
    input.click()
  }

  const handleDelete = async (docType: string) => {
    setDeletingType(docType)
    try {
      const response = await fetch(`/api/mentor/documents?type=${docType}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentorDocs.deleteSuccess'))
        await fetchMentorDocuments()
      } else {
        toast.error(result.error || t('mentorDocs.deleteFailed'))
      }
    } catch {
      toast.error(t('mentorDocs.deleteFailed'))
    } finally {
      setDeletingType(null)
    }
  }

  const docTypes = [
    { key: 'resume', label: t('mentorDocs.resume'), description: t('mentorDocs.resumeDesc') },
    { key: 'bank_account', label: t('mentorDocs.bankAccount'), description: t('mentorDocs.bankAccountDesc') },
    { key: 'privacy_consent', label: t('mentorDocs.privacyConsent'), description: t('mentorDocs.privacyConsentDesc') },
    { key: 'id_card', label: t('mentorDocs.idCard'), description: t('mentorDocs.idCardDesc') },
  ]

  const allDocsUploaded = documents?.resume && documents?.bank_account && documents?.privacy_consent && documents?.id_card

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      const response = await fetch('/api/settings/account', { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success(t('deleteAccount.successMessage'))
        router.push('/ko/login')
      } else {
        toast.error(result.error || t('deleteAccount.failed'))
      }
    } catch {
      toast.error(t('deleteAccount.failed'))
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <div className="grid gap-6">
        {/* 프로필 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile')}
            </CardTitle>
            <CardDescription>{t('profileDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <div className="flex gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                  placeholder={t('name')}
                />
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || !editName.trim() || editName.trim() === (profile?.name || '')}
                >
                  {isSavingProfile ? <LoadingSpinner size="sm" /> : t('save')}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <Input value={profile?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">{t('emailReadonly')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('role')}</Label>
              <Input value={roleLabels[profile?.role || 'user'] || profile?.role || ''} disabled className="bg-muted" />
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('password')}
            </CardTitle>
            <CardDescription>{t('passwordDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('newPassword')}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('confirmPassword')}</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isSavingPassword || !newPassword || !confirmPassword}
            >
              {isSavingPassword ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('changePassword')}
            </Button>
          </CardContent>
        </Card>

        {/* 기관 정보 (기관 담당자만) */}
        {profile?.role === 'institution' && institution && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('institution')}
              </CardTitle>
              <CardDescription>{t('institutionDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('institutionName')}</Label>
                <Input
                  value={editInstitution.name || ''}
                  onChange={(e) => setEditInstitution(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('contactEmail')}</Label>
                <Input
                  type="email"
                  value={editInstitution.contact_email || ''}
                  onChange={(e) => setEditInstitution(prev => ({ ...prev, contact_email: e.target.value || null }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('contactPhone')}</Label>
                <Input
                  value={editInstitution.contact_phone || ''}
                  onChange={(e) => setEditInstitution(prev => ({ ...prev, contact_phone: e.target.value || null }))}
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('address')}</Label>
                <Input
                  value={editInstitution.address || ''}
                  onChange={(e) => setEditInstitution(prev => ({ ...prev, address: e.target.value || null }))}
                  maxLength={500}
                />
              </div>
              <Button
                onClick={handleSaveInstitution}
                disabled={isSavingInstitution}
              >
                {isSavingInstitution ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                {t('save')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 테마 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('theme')}</CardTitle>
            <CardDescription>{t('themeDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="mb-2 text-2xl">☀️</span>
                  {t('light')}
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="mb-2 text-2xl">🌙</span>
                  {t('dark')}
                </Label>
              </div>
              <div>
                <RadioGroupItem value="system" id="system" className="peer sr-only" />
                <Label
                  htmlFor="system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="mb-2 text-2xl">💻</span>
                  {t('system')}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 언어 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('language')}</CardTitle>
            <CardDescription>{t('languageDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={locale}
              onValueChange={switchLocale}
              className="grid grid-cols-2 gap-4"
            >
              {locales.map((loc) => (
                <div key={loc}>
                  <RadioGroupItem value={loc} id={loc} className="peer sr-only" />
                  <Label
                    htmlFor={loc}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="mb-2 text-2xl">
                      {loc === 'ko' ? '🇰🇷' : '🇺🇸'}
                    </span>
                    {localeLabels[loc]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 멘토 증빙 서류 */}
        {isMentor && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t('mentorDocs.title')}
                  </CardTitle>
                  <CardDescription>{t('mentorDocs.description')}</CardDescription>
                </div>
                {allDocsUploaded ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Check className="mr-1 h-3 w-3" />
                    {t('mentorDocs.allComplete')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-300">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {t('mentorDocs.incomplete')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDocs ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-4">
                  {docTypes.map((doc) => {
                    const url = documents?.[doc.key as keyof MentorDocuments]
                    const isUploading = uploadingType === doc.key
                    const isDeleting = deletingType === doc.key

                    return (
                      <div
                        key={doc.key}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{doc.label}</p>
                            {url ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {t('mentorDocs.uploaded')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                {t('mentorDocs.notUploaded')}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{doc.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {url && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => window.open(url, '_blank')}>
                                <FileText className="mr-1 h-3 w-3" />
                                {t('mentorDocs.view')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(doc.key)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? <LoadingSpinner size="sm" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpload(doc.key)}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <LoadingSpinner size="sm" className="mr-1" />
                            ) : (
                              <Upload className="mr-1 h-3 w-3" />
                            )}
                            {url ? t('mentorDocs.reupload') : t('mentorDocs.upload')}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  <p className="text-xs text-muted-foreground">{t('mentorDocs.fileHint')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 계정 탈퇴 (일반 사용자만) */}
        {profile?.role === 'user' && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">{t('deleteAccount.title')}</CardTitle>
              <CardDescription>{t('deleteAccount.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => { setShowDeleteDialog(true); setDeleteConfirmText('') }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteAccount.button')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 계정 탈퇴 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('deleteAccount.confirmTitle')}</DialogTitle>
            <DialogDescription>{t('deleteAccount.confirmDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('deleteAccount.warningMessage')}
            </p>
            <div className="space-y-2">
              <Label className="text-sm">
                {t('deleteAccount.confirmInputLabel', { keyword: t('deleteAccount.confirmKeyword') })}
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t('deleteAccount.confirmKeyword')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('deleteAccount.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== t('deleteAccount.confirmKeyword') || isDeletingAccount}
              onClick={handleDeleteAccount}
            >
              {isDeletingAccount ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('deleteAccount.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
