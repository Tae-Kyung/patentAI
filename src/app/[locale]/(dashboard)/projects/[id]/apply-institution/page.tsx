'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Building2, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface Institution {
  id: string
  name: string
  description?: string
}

interface Application {
  id: string
  institution_id: string
  institution_name: string
  motivation: string
  status: string
  created_at: string
}

const applicationStatusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
}

export default function ApplyInstitutionPage() {
  const t = useTranslations('applicant.apply')
  const params = useParams()
  const id = params.id as string

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [motivation, setMotivation] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [institutionsRes, applicationsRes] = await Promise.all([
        fetch('/api/admin/institutions?approved=true&limit=100'),
        fetch(`/api/projects/${id}/apply-institution`),
      ])

      const institutionsResult = await institutionsRes.json()
      const applicationsResult = await applicationsRes.json()

      if (institutionsResult.success) {
        setInstitutions(institutionsResult.data || [])
      }

      if (applicationsResult.success) {
        setApplications(applicationsResult.data || [])
      }
    } catch {
      toast.error(t('fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleSubmit = async () => {
    if (!selectedInstitution) {
      toast.error(t('selectInstitution'))
      return
    }
    if (!motivation.trim()) {
      toast.error(t('enterMotivation'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${id}/apply-institution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: selectedInstitution,
          motivation: motivation.trim(),
        }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('submitSuccess'))
        setSelectedInstitution('')
        setMotivation('')
        await fetchData()
      } else {
        toast.error(result.error || t('submitFailed'))
      }
    } catch {
      toast.error(t('submitFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Filter out institutions the user already applied to
  const appliedInstitutionIds = new Set(
    applications.map((app) => app.institution_id)
  )
  const availableInstitutions = institutions.filter(
    (inst) => !appliedInstitutionIds.has(inst.id)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Existing Applications */}
      {applications.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('myApplications')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {applications.map((application) => (
              <Card key={application.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {application.institution_name}
                    </CardTitle>
                    <Badge
                      className={
                        applicationStatusColor[application.status] ||
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }
                    >
                      {t(`status.${application.status}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {application.motivation}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(application.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('newApplication')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Institution Select */}
          <div className="space-y-2">
            <Label htmlFor="institution">{t('institution')}</Label>
            {availableInstitutions.length > 0 ? (
              <Select
                value={selectedInstitution}
                onValueChange={setSelectedInstitution}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectInstitutionPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {availableInstitutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('noAvailableInstitutions')}
              </p>
            )}
          </div>

          {/* Motivation */}
          <div className="space-y-2">
            <Label htmlFor="motivation">{t('motivation')}</Label>
            <Textarea
              id="motivation"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder={t('motivationPlaceholder')}
              rows={5}
              disabled={availableInstitutions.length === 0}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !selectedInstitution ||
              !motivation.trim() ||
              availableInstitutions.length === 0
            }
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {t('submit')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
