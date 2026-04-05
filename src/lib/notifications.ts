import { createServiceClient } from '@/lib/supabase/service'

interface CreateNotificationParams {
  userId: string
  type: string
  title: string
  message?: string
  link?: string
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const supabase = createServiceClient()

    await supabase
      .from('bi_notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message || null,
        link: params.link || null,
      })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
  try {
    const supabase = createServiceClient()

    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      link: params.link || null,
    }))

    await supabase
      .from('bi_notifications')
      .insert(notifications)
  } catch (error) {
    console.error('Failed to create bulk notifications:', error)
  }
}
