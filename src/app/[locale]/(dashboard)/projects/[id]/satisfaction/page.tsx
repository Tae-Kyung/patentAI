'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface RatingItem {
  key: string
  label: string
  value: number
}

interface SatisfactionData {
  expertise: number
  specificity: number
  responsiveness: number
  overall: number
  comment: string
  submitted_at?: string
}

const RATING_KEYS = ['expertise', 'specificity', 'responsiveness', 'overall'] as const

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number
  onChange: (val: number) => void
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={`transition-colors ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => !disabled && setHovered(0)}
          onClick={() => !disabled && onChange(star)}
        >
          <Star
            className={`h-6 w-6 ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function SatisfactionPage() {
  const t = useTranslations('applicant.satisfaction')
  const params = useParams()
  const id = params.id as string

  const [ratings, setRatings] = useState<Record<string, number>>({
    expertise: 0,
    specificity: 0,
    responsiveness: 0,
    overall: 0,
  })
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  useEffect(() => {
    const fetchExisting = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/projects/${id}/satisfaction`)
        const result = await response.json()

        if (result.success && result.data) {
          const data = result.data as SatisfactionData
          setRatings({
            expertise: data.expertise || 0,
            specificity: data.specificity || 0,
            responsiveness: data.responsiveness || 0,
            overall: data.overall || 0,
          })
          setComment(data.comment || '')
          if (data.submitted_at) {
            setIsSubmitted(true)
            setSubmittedAt(data.submitted_at)
          }
        }
      } catch {
        // No existing data, show empty form
      } finally {
        setIsLoading(false)
      }
    }

    fetchExisting()
  }, [id])

  const handleRatingChange = (key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    // Validate all ratings are filled
    const unrated = RATING_KEYS.filter((key) => ratings[key] === 0)
    if (unrated.length > 0) {
      toast.error(t('fillAllRatings'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${id}/satisfaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ratings,
          comment: comment.trim(),
        }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('submitSuccess'))
        setIsSubmitted(true)
        setSubmittedAt(new Date().toISOString())
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Submitted Banner */}
      {isSubmitted && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
              <Star className="h-4 w-4 fill-current" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {t('alreadySubmitted')}
              </p>
              {submittedAt && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  {new Date(submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {t('ratingTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {RATING_KEYS.map((key) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t(`rating.${key}`)}
                </Label>
                {ratings[key] > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {ratings[key]} / 5
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(`ratingDesc.${key}`)}
              </p>
              <StarRating
                value={ratings[key]}
                onChange={(val) => handleRatingChange(key, val)}
                disabled={isSubmitted}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Comment */}
      <Card>
        <CardHeader>
          <CardTitle>{t('commentTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="comment">{t('commentLabel')}</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('commentPlaceholder')}
            rows={4}
            disabled={isSubmitted}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      {!isSubmitted && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
          size="lg"
        >
          {isSubmitting ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Star className="mr-2 h-4 w-4" />
          )}
          {t('submit')}
        </Button>
      )}
    </div>
  )
}
