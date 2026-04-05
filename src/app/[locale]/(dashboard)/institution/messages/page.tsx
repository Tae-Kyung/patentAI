'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Mail,
  RefreshCw,
  Send,
  Inbox,
  SendHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'

interface UserRef {
  id: string
  name: string | null
  email: string
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  sender: UserRef
  recipient: UserRef
  subject: string | null
  content: string
  is_read: boolean
  created_at: string
}

interface MessageDetail extends Message {
  replies: Reply[]
}

interface Reply {
  id: string
  sender_id: string
  sender: UserRef
  content: string
  created_at: string
}

interface MessagesResponse {
  success: boolean
  data: {
    items: Message[]
    total: number
    page: number
    totalPages: number
  }
}

interface MessageDetailResponse {
  success: boolean
  data: MessageDetail
}

const LIMIT = 10

export default function InstitutionMessagesPage() {
  const t = useTranslations()

  // Tab state
  const [activeTab, setActiveTab] = useState('inbox')

  // Inbox state
  const [inboxMessages, setInboxMessages] = useState<Message[]>([])
  const [inboxPage, setInboxPage] = useState(1)
  const [inboxTotalPages, setInboxTotalPages] = useState(1)
  const [inboxLoading, setInboxLoading] = useState(false)

  // Sent state
  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [sentPage, setSentPage] = useState(1)
  const [sentTotalPages, setSentTotalPages] = useState(1)
  const [sentLoading, setSentLoading] = useState(false)

  // Message detail state
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replySending, setReplySending] = useState(false)

  // New message dialog state
  const [newMessageOpen, setNewMessageOpen] = useState(false)
  const [newRecipientId, setNewRecipientId] = useState('')
  const [newRecipientLabel, setNewRecipientLabel] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientResults, setRecipientResults] = useState<Array<{ id: string; name: string | null; email: string; role: string }>>([])
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newMessageSending, setNewMessageSending] = useState(false)

  // Bulk send state
  const [bulkTarget, setBulkTarget] = useState('')
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkBody, setBulkBody] = useState('')
  const [bulkSending, setBulkSending] = useState(false)

  // Recipient search with debounce
  const recipientDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (recipientSearch.trim().length < 2) {
      setRecipientResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(recipientSearch.trim())}&limit=10`)
        const result = await res.json()
        if (result.success) {
          setRecipientResults(result.data)
          setRecipientDropdownOpen(true)
        }
      } catch {
        // ignore
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [recipientSearch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(e.target as Node)) {
        setRecipientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch inbox messages
  const fetchInbox = async (page: number = inboxPage) => {
    setInboxLoading(true)
    try {
      const response = await fetch(`/api/messages?folder=inbox&page=${page}&limit=${LIMIT}`)
      const result: MessagesResponse = await response.json()
      if (result.success) {
        setInboxMessages(result.data.items || [])
        setInboxTotalPages(result.data.totalPages)
        setInboxPage(result.data.page)
      } else {
        toast.error(t('institution.messages.fetchFailed'))
      }
    } catch {
      toast.error(t('institution.messages.fetchFailed'))
    } finally {
      setInboxLoading(false)
    }
  }

  // Fetch sent messages
  const fetchSent = async (page: number = sentPage) => {
    setSentLoading(true)
    try {
      const response = await fetch(`/api/messages?folder=sent&page=${page}&limit=${LIMIT}`)
      const result: MessagesResponse = await response.json()
      if (result.success) {
        setSentMessages(result.data.items || [])
        setSentTotalPages(result.data.totalPages)
        setSentPage(result.data.page)
      } else {
        toast.error(t('institution.messages.fetchFailed'))
      }
    } catch {
      toast.error(t('institution.messages.fetchFailed'))
    } finally {
      setSentLoading(false)
    }
  }

  // Fetch message detail
  const fetchMessageDetail = async (id: string) => {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      // Mark as read
      await fetch(`/api/messages/${id}/read`, { method: 'PATCH' })

      const response = await fetch(`/api/messages/${id}`)
      const result: MessageDetailResponse = await response.json()
      if (result.success) {
        setSelectedMessage(result.data)
        // Update read status in the inbox list
        setInboxMessages((prev) =>
          prev.map((msg) => (msg.id === id ? { ...msg, is_read: true } : msg))
        )
      } else {
        toast.error(t('institution.messages.fetchDetailFailed'))
        setDetailOpen(false)
      }
    } catch {
      toast.error(t('institution.messages.fetchDetailFailed'))
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  // Send reply
  const handleReply = async () => {
    if (!selectedMessage || !replyBody.trim()) return

    setReplySending(true)
    try {
      const response = await fetch(`/api/messages/${selectedMessage.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.messages.replySent'))
        setReplyBody('')
        // Refresh the detail to show new reply
        await fetchMessageDetail(selectedMessage.id)
      } else {
        toast.error(t('institution.messages.replyFailed'))
      }
    } catch {
      toast.error(t('institution.messages.replyFailed'))
    } finally {
      setReplySending(false)
    }
  }

  // Send new message
  const handleNewMessage = async () => {
    if (!newRecipientId.trim() || !newSubject.trim() || !newBody.trim()) {
      toast.error(t('institution.messages.fillAllFields'))
      return
    }

    setNewMessageSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: newRecipientId,
          subject: newSubject,
          body: newBody,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.messages.messageSent'))
        setNewMessageOpen(false)
        setNewRecipientId('')
        setNewSubject('')
        setNewBody('')
        // Refresh sent messages if on sent tab
        if (activeTab === 'sent') {
          fetchSent(1)
        }
      } else {
        toast.error(t('institution.messages.sendFailed'))
      }
    } catch {
      toast.error(t('institution.messages.sendFailed'))
    } finally {
      setNewMessageSending(false)
    }
  }

  // Send bulk message
  const handleBulkSend = async () => {
    if (!bulkTarget || !bulkSubject.trim() || !bulkBody.trim()) {
      toast.error(t('institution.messages.fillAllFields'))
      return
    }

    setBulkSending(true)
    try {
      const response = await fetch('/api/institution/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: bulkTarget,
          subject: bulkSubject,
          body: bulkBody,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.messages.bulkSent'))
        setBulkTarget('')
        setBulkSubject('')
        setBulkBody('')
      } else {
        toast.error(t('institution.messages.bulkFailed'))
      }
    } catch {
      toast.error(t('institution.messages.bulkFailed'))
    } finally {
      setBulkSending(false)
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchInbox(inboxPage)
    } else if (activeTab === 'sent') {
      fetchSent(sentPage)
    }
  }, [activeTab])

  // Handle detail dialog close
  const handleDetailClose = (open: boolean) => {
    setDetailOpen(open)
    if (!open) {
      setSelectedMessage(null)
      setReplyBody('')
    }
  }

  // Handle new message dialog close
  const handleNewMessageClose = (open: boolean) => {
    setNewMessageOpen(open)
    if (!open) {
      setNewRecipientId('')
      setNewRecipientLabel('')
      setRecipientSearch('')
      setRecipientResults([])
      setRecipientDropdownOpen(false)
      setNewSubject('')
      setNewBody('')
    }
  }

  // Render message list item
  const renderMessageItem = (message: Message, folder: 'inbox' | 'sent') => {
    const senderName = message.sender?.name || message.sender?.email || ''
    const recipientName = message.recipient?.name || message.recipient?.email || ''
    const displayName = folder === 'inbox' ? senderName : recipientName
    const body = message.content || ''
    const preview = body.length > 80 ? body.slice(0, 80) + '...' : body

    return (
      <div
        key={message.id}
        onClick={() => fetchMessageDetail(message.id)}
        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
          !message.is_read && folder === 'inbox'
            ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
            : 'border-border'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${!message.is_read && folder === 'inbox' ? 'font-bold' : ''}`}>
              {displayName}
            </span>
            {!message.is_read && folder === 'inbox' && (
              <Badge variant="default" className="text-xs shrink-0">
                {t('institution.messages.new')}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium text-foreground truncate mt-0.5">
            {message.subject}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {preview}
          </p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {formatDate(message.created_at)}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('institution.messages.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('institution.messages.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            if (activeTab === 'inbox') fetchInbox(inboxPage)
            else if (activeTab === 'sent') fetchSent(sentPage)
          }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setNewMessageOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            {t('institution.messages.newMessage')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox">
            <Inbox className="mr-1.5 h-4 w-4" />
            {t('institution.messages.inbox')}
          </TabsTrigger>
          <TabsTrigger value="sent">
            <SendHorizontal className="mr-1.5 h-4 w-4" />
            {t('institution.messages.sent')}
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Send className="mr-1.5 h-4 w-4" />
            {t('institution.messages.bulkSend')}
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                {t('institution.messages.inbox')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inboxLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : inboxMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Inbox className="h-12 w-12 mb-3 opacity-40" />
                  <p className="text-sm">{t('institution.messages.noMessages')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {inboxMessages.map((msg) => renderMessageItem(msg, 'inbox'))}
                  </div>
                  <div className="mt-4">
                    <Pagination
                      currentPage={inboxPage}
                      totalPages={inboxTotalPages}
                      onPageChange={(page) => {
                        setInboxPage(page)
                        fetchInbox(page)
                      }}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SendHorizontal className="h-5 w-5" />
                {t('institution.messages.sent')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : sentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <SendHorizontal className="h-12 w-12 mb-3 opacity-40" />
                  <p className="text-sm">{t('institution.messages.noSentMessages')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {sentMessages.map((msg) => renderMessageItem(msg, 'sent'))}
                  </div>
                  <div className="mt-4">
                    <Pagination
                      currentPage={sentPage}
                      totalPages={sentTotalPages}
                      onPageChange={(page) => {
                        setSentPage(page)
                        fetchSent(page)
                      }}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Send Tab */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {t('institution.messages.bulkSend')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-2xl">
                {/* Target Select */}
                <div className="space-y-2">
                  <Label htmlFor="bulk-target">
                    {t('institution.messages.bulkTarget')}
                  </Label>
                  <Select value={bulkTarget} onValueChange={setBulkTarget}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('institution.messages.selectTarget')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mentors">
                        {t('institution.messages.targetMentors')}
                      </SelectItem>
                      <SelectItem value="applicants">
                        {t('institution.messages.targetApplicants')}
                      </SelectItem>
                      <SelectItem value="all">
                        {t('institution.messages.targetAll')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="bulk-subject">
                    {t('institution.messages.subject')}
                  </Label>
                  <Input
                    id="bulk-subject"
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    placeholder={t('institution.messages.subjectPlaceholder')}
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label htmlFor="bulk-body">
                    {t('institution.messages.body')}
                  </Label>
                  <Textarea
                    id="bulk-body"
                    value={bulkBody}
                    onChange={(e) => setBulkBody(e.target.value)}
                    placeholder={t('institution.messages.bodyPlaceholder')}
                    rows={8}
                  />
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleBulkSend}
                  disabled={bulkSending || !bulkTarget || !bulkSubject.trim() || !bulkBody.trim()}
                >
                  {bulkSending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {t('institution.messages.sendBulk')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={handleDetailClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMessage?.subject || t('institution.messages.messageDetail')}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : selectedMessage ? (
            <div className="space-y-4">
              {/* Original message */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {t('institution.messages.from')}:
                    </span>{' '}
                    <span className="font-medium">{selectedMessage.sender?.name || selectedMessage.sender?.email}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(selectedMessage.created_at)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {t('institution.messages.to')}:
                  </span>{' '}
                  <span className="font-medium">{selectedMessage.recipient?.name || selectedMessage.recipient?.email}</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </div>

              {/* Replies */}
              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('institution.messages.replies')} ({selectedMessage.replies.length})
                  </h4>
                  {selectedMessage.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-lg border bg-muted/30 p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{reply.sender?.name || reply.sender?.email || ''}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="reply-body">
                  {t('institution.messages.replyLabel')}
                </Label>
                <Textarea
                  id="reply-body"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={t('institution.messages.replyPlaceholder')}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleReply}
                    disabled={replySending || !replyBody.trim()}
                    size="sm"
                  >
                    {replySending ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {t('institution.messages.sendReply')}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* New Message Dialog */}
      <Dialog open={newMessageOpen} onOpenChange={handleNewMessageClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('institution.messages.newMessage')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="new-recipient">
                {t('institution.messages.recipient')}
              </Label>
              <div className="relative" ref={recipientDropdownRef}>
                {newRecipientId ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <span className="flex-1 text-sm">{newRecipientLabel}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground text-sm"
                      onClick={() => {
                        setNewRecipientId('')
                        setNewRecipientLabel('')
                        setRecipientSearch('')
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <Input
                    id="new-recipient"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    onFocus={() => recipientResults.length > 0 && setRecipientDropdownOpen(true)}
                    placeholder={t('institution.messages.searchRecipient')}
                    autoComplete="off"
                  />
                )}
                {recipientDropdownOpen && recipientResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                    {recipientResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                        onClick={() => {
                          setNewRecipientId(u.id)
                          setNewRecipientLabel(`${u.name || u.email} (${u.email})`)
                          setRecipientSearch('')
                          setRecipientDropdownOpen(false)
                        }}
                      >
                        <div className="font-medium">{u.name || u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.email} · {u.role}</div>
                      </button>
                    ))}
                  </div>
                )}
                {recipientDropdownOpen && recipientSearch.trim().length >= 2 && recipientResults.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-sm text-muted-foreground">
                    {t('institution.messages.noUsersFound')}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="new-subject">
                {t('institution.messages.subject')}
              </Label>
              <Input
                id="new-subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={t('institution.messages.subjectPlaceholder')}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="new-body">
                {t('institution.messages.body')}
              </Label>
              <Textarea
                id="new-body"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder={t('institution.messages.bodyPlaceholder')}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleNewMessageClose(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleNewMessage}
              disabled={newMessageSending || !newRecipientId.trim() || !newSubject.trim() || !newBody.trim()}
            >
              {newMessageSending ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t('institution.messages.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
