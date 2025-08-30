// Service Worker for PyTake Notifications
const CACHE_NAME = 'pytake-notifications-v1'
const NOTIFICATION_TAG_PREFIX = 'pytake-'

// Install event
self.addEventListener('install', (event) => {
  console.log('PyTake Service Worker installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('PyTake Service Worker activated')
  event.waitUntil(self.clients.claim())
})

// Handle background sync (for offline messages)
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag)
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages())
  }
})

// Handle push notifications (future implementation)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)
  
  if (event.data) {
    const payload = event.data.json()
    event.waitUntil(showPushNotification(payload))
  }
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification)
  
  const notification = event.notification
  const data = notification.data || {}
  
  notification.close()
  
  // Handle different actions
  if (event.action === 'reply') {
    // Quick reply action (future implementation)
    event.waitUntil(handleQuickReply(data))
  } else if (event.action === 'mark-read') {
    // Mark as read action
    event.waitUntil(markAsRead(data))
  } else {
    // Default action - open app
    event.waitUntil(openApp(data))
  }
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag)
  
  // Track notification dismissal analytics if needed
  if (event.notification.data?.trackDismissal) {
    trackNotificationDismissal(event.notification.data)
  }
})

// Functions

async function showPushNotification(payload) {
  const { title, body, icon, badge, tag, data, actions } = payload
  
  try {
    const options = {
      body: body,
      icon: icon || '/logo-notification.png',
      badge: badge || '/logo-badge.png',
      tag: NOTIFICATION_TAG_PREFIX + (tag || Date.now()),
      data: data || {},
      requireInteraction: data?.priority === 'high',
      silent: false,
      vibrate: [200, 100, 200],
      actions: actions || [
        {
          action: 'reply',
          title: 'Responder',
          icon: '/icons/reply.png'
        },
        {
          action: 'mark-read',
          title: 'Marcar como lida',
          icon: '/icons/check.png'
        }
      ]
    }
    
    await self.registration.showNotification(title, options)
  } catch (error) {
    console.error('Error showing push notification:', error)
  }
}

async function openApp(data) {
  const urlToOpen = data?.conversationId 
    ? `/conversations/${data.conversationId}`
    : '/conversations'
    
  const fullUrl = new URL(urlToOpen, self.location.origin).href
  
  try {
    // Check if app is already open
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    
    // Find existing app window
    const existingClient = clients.find(client => {
      return client.url.includes('conversations') || client.url === self.location.origin + '/'
    })
    
    if (existingClient) {
      // Focus existing window and navigate
      await existingClient.focus()
      if (existingClient.navigate) {
        await existingClient.navigate(fullUrl)
      } else {
        // Fallback: post message to client
        existingClient.postMessage({
          type: 'NAVIGATE',
          url: urlToOpen
        })
      }
    } else {
      // Open new window
      await self.clients.openWindow(fullUrl)
    }
  } catch (error) {
    console.error('Error opening app:', error)
    // Fallback: open new window
    self.clients.openWindow(fullUrl)
  }
}

async function handleQuickReply(data) {
  // Future implementation for quick reply
  console.log('Quick reply not implemented yet:', data)
  
  // For now, just open the conversation
  await openApp(data)
}

async function markAsRead(data) {
  if (!data?.conversationId) return
  
  try {
    // Send message to all clients to mark conversation as read
    const clients = await self.clients.matchAll()
    
    clients.forEach(client => {
      client.postMessage({
        type: 'MARK_AS_READ',
        conversationId: data.conversationId
      })
    })
    
    console.log('Mark as read message sent to clients')
  } catch (error) {
    console.error('Error marking as read:', error)
  }
}

async function syncPendingMessages() {
  // Future implementation for offline message sync
  console.log('Syncing pending messages...')
  
  try {
    // Get pending messages from IndexedDB
    // Send them via fetch API
    // Update UI via postMessage to clients
    
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE'
      })
    })
  } catch (error) {
    console.error('Error syncing messages:', error)
  }
}

function trackNotificationDismissal(data) {
  // Analytics tracking for notification dismissals
  console.log('Tracking notification dismissal:', data)
  
  // Future implementation: send analytics data
}

// Handle messages from main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)
  
  const { type, payload } = event.data
  
  switch (type) {
    case 'SHOW_NOTIFICATION':
      showPushNotification(payload)
      break
      
    case 'CLEAR_NOTIFICATIONS':
      clearAllNotifications(payload?.tag)
      break
      
    case 'UPDATE_BADGE':
      updateBadge(payload?.count || 0)
      break
      
    default:
      console.log('Unknown message type:', type)
  }
})

async function clearAllNotifications(tag) {
  try {
    const notifications = await self.registration.getNotifications({
      tag: tag ? NOTIFICATION_TAG_PREFIX + tag : undefined
    })
    
    notifications.forEach(notification => notification.close())
    console.log(`Cleared ${notifications.length} notifications`)
  } catch (error) {
    console.error('Error clearing notifications:', error)
  }
}

function updateBadge(count) {
  // Future implementation for badge API
  console.log('Updating badge count:', count)
}

// Keep service worker alive
self.addEventListener('fetch', (event) => {
  // Don't interfere with normal fetch requests, just keep SW active
})