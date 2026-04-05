'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Mail,
  RefreshCw,
  Send,
  Inbox,
  SendHorizontal,
  Trash2,
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

const LIMIT = 10

export default function MessagesPage() {
  const t = useTranslations()

  const [activeTab, setActiveTab] = useState('inbox')

  const [inboxMessages, setInboxMessages] = useState<Message[]>([])
  const [inboxPage, setInboxPage] = useState(1)
  const [inboxTotalPages, setInboxTotalPages] = useState(1)
  const [inboxLoading, setInboxLoading] = useState(false)

  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [sentPage, setSentPage] = useState(1)
  const [sentTotalPages, setSentTotalPages] = useState(1)
  const [sentLoading, setSentLoading] = useState(false)

  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replySending, setReplySending] = useState(false)

  const [newMessageOpen, setNewMessageOpen] = useState(false)
  const [newRecipientId, setNewRecipientId] = useState('')
  const [newRecipientLabel, setNewRecipientLabel] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientResults, setRecipientResults] = useState<Array<{ id: string; name: string | null; email: string; role: string }>>([])
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newMessageSending, setNewMessageSending] = useState(false)

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

  const fetchInbox = async (page: number = inboxPage) => {
    setInboxLoading(true)
    try {
      const response = await fetch(`/api/messages?folder=inbox&page=${page}&limit=${LIMIT}`)
      const result = await response.json()
      if (result.success) {
        setInboxMessages(result.data.items || [])
        setInboxTotalPages(result.data.totalPages)
        setInboxPage(result.data.page)
      } else {
        toast.error(t('messages.fetchFailed'))
      }
    } catch {
      toast.error(t('messages.fetchFailed'))
    } finally {
      setInboxLoading(false)
    }
  }

  const fetchSent = async (page: number = sentPage) => {
    setSentLoading(true)
    try {
      const response = await fetch(`/api/messages?folder=sent&page=${page}&limit=${LIMIT}`)
      const result = await response.json()
      if (result.success) {
        setSentMessages(result.data.items || [])
        setSentTotalPages(result.data.totalPages)
        setSentPage(result.data.page)
      } else {
        toast.error(t('messages.fetchFailed'))
      }
    } catch {
      toast.error(t('messages.fetchFailed'))
    } finally {
      setSentLoading(false)
    }
  }

  const fetchMessageDetail = async (id: string) => {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      await fetch(`/api/messages/${id}/read`, { method: 'PATCH' })
      const response = await fetch(`/api/messages/${id}`)
      const result = await response.json()
      if (result.success) {
        setSelectedMessage(result.data)
        setInboxMessages((prev) =>
          prev.map((msg) => (msg.id === id ? { ...msg, is_read: true } : msg))
        )
      } else {
        toast.error(t('messages.fetchDetailFailed'))
        setDetailOpen(false)
      }
    } catch {
      toast.error(t('messages.fetchDetailFailed'))
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

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
        toast.success(t('messages.replySent'))
        setReplyBody('')
        await fetchMessageDetail(selectedMessage.id)
      } else {
        toast.error(t('messages.replyFailed'))
      }
    } catch {
      toast.error(t('messages.replyFailed'))
    } finally {
      setReplySending(false)
    }
  }

  const handleNewMessage = async () => {
    if (!newRecipientId.trim() || !newSubject.trim() || !newBody.trim()) {
      toast.error(t('messages.fillAllFields'))
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
        toast.success(t('messages.messageSent'))
        setNewMessageOpen(false)
        setNewRecipientId('')
        setNewSubject('')
        setNewBody('')
        if (activeTab === 'sent') fetchSent(1)
      } else {
        toast.error(t('messages.sendFailed'))
      }
    } catch {
      toast.error(t('messages.sendFailed'))
    } finally {
      setNewMessageSending(false)
    }
  }

  const handleDeleteMessage = async (id: string) => {
    try {
      const response = await fetch(`/api/messages/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success(t('messages.deleted'))
        setDetailOpen(false)
        setSelectedMessage(null)
        fetchInbox(inboxPage)
      } else {
        toast.error(result.error || t('messages.deleteFailed'))
      }
    } catch {
      toast.error(t('messages.deleteFailed'))
    }
  }

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

  useEffect(() => {
    if (activeTab === 'inbox') fetchInbox(inboxPage)
    else if (activeTab === 'sent') fetchSent(sentPage)
  }, [activeTab])

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
                {t('messages.new')}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('messages.title')}</h1>
          <p className="text-muted-foreground">{t('messages.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            if (activeTab === 'inbox') fetchInbox(inboxPage)
            else fetchSent(sentPage)
          }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setNewMessageOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            {t('messages.newMessage')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox">
            <Inbox className="mr-1.5 h-4 w-4" />
            {t('messages.inbox')}
          </TabsTrigger>
          <TabsTrigger value="sent">
            <SendHorizontal className="mr-1.5 h-4 w-4" />
            {t('messages.sent')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                {t('messages.inbox')}
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
                  <p className="text-sm">{t('messages.noMessages')}</p>
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

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SendHorizontal className="h-5 w-5" />
                {t('messages.sent')}
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
                  <p className="text-sm">{t('messages.noSentMessages')}</p>
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
      </Tabs>

      {/* Message Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => {
        setDetailOpen(open)
        if (!open) { setSelectedMessage(null); setReplyBody('') }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMessage?.subject || t('messages.messageDetail')}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : selectedMessage ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('messages.from')}:</span>{' '}
                    <span className="font-medium">{selectedMessage.sender?.name || selectedMessage.sender?.email}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(selectedMessage.created_at)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('messages.to')}:</span>{' '}
                  <span className="font-medium">{selectedMessage.recipient?.name || selectedMessage.recipient?.email}</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </div>

              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('messages.replies')} ({selectedMessage.replies.length})
                  </h4>
                  {selectedMessage.replies.map((reply) => (
                    <div key={reply.id} className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{reply.sender?.name || reply.sender?.email || ''}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="reply-body">{t('messages.replyLabel')}</Label>
                <Textarea
                  id="reply-body"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={t('messages.replyPlaceholder')}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    onClick={() => {
                      if (selectedMessage && confirm(t('messages.deleteConfirm'))) {
                        handleDeleteMessage(selectedMessage.id)
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('messages.delete')}
                  </Button>
                  <Button onClick={handleReply} disabled={replySending || !replyBody.trim()} size="sm">
                    {replySending ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                    {t('messages.sendReply')}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* New Message Dialog */}
      <Dialog open={newMessageOpen} onOpenChange={(open) => {
        setNewMessageOpen(open)
        if (!open) { setNewRecipientId(''); setNewRecipientLabel(''); setRecipientSearch(''); setRecipientResults([]); setRecipientDropdownOpen(false); setNewSubject(''); setNewBody('') }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('messages.newMessage')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('messages.recipient')}</Label>
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
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    onFocus={() => recipientResults.length > 0 && setRecipientDropdownOpen(true)}
                    placeholder={t('messages.searchRecipient')}
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
                    {t('messages.noUsersFound')}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('messages.subject')}</Label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={t('messages.subjectPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('messages.body')}</Label>
              <Textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder={t('messages.bodyPlaceholder')}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMessageOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleNewMessage}
              disabled={newMessageSending || !newRecipientId.trim() || !newSubject.trim() || !newBody.trim()}
            >
              {newMessageSending ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
              {t('messages.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
