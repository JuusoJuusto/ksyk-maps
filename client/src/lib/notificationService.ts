// Notification Service
// Handles sending notifications based on user preferences

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  gradeNotifications: boolean;
  homeworkNotifications: boolean;
  attendanceNotifications: boolean;
  messageNotifications: boolean;
}

interface SendNotificationParams {
  userId: string;
  type: 'grade' | 'homework' | 'attendance' | 'message' | 'general';
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
}

export class NotificationService {
  /**
   * Send a notification to a user based on their preferences
   */
  static async sendNotification(params: SendNotificationParams): Promise<boolean> {
    const { userId, type, title, message, priority = 'medium' } = params;

    try {
      // Load user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Check if user wants this type of notification
      if (!this.shouldSendNotification(type, preferences)) {
        return false;
      }

      // Create notification object
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        priority
      };

      // Save to localStorage
      const stored = localStorage.getItem(`notifications_${userId}`);
      const notifications = stored ? JSON.parse(stored) : [];
      notifications.unshift(notification); // Add to beginning
      
      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(50);
      }
      
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));

      // Send to backend
      try {
        await fetch('/api/wilma/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            notification
          })
        });
      } catch (error) {
        console.error('Failed to save notification to backend:', error);
      }

      // Send email if enabled
      if (preferences.emailNotifications) {
        await this.sendEmailNotification(userId, notification);
      }

      // Send push notification if enabled
      if (preferences.pushNotifications) {
        await this.sendPushNotification(userId, notification);
      }

      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('newNotification', { 
        detail: notification 
      }));

      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Get user notification preferences
   */
  private static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Try backend first
      const response = await fetch(`/api/wilma/user-settings/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          return {
            emailNotifications: data.settings.emailNotifications ?? true,
            pushNotifications: data.settings.pushNotifications ?? true,
            gradeNotifications: data.settings.gradeNotifications ?? true,
            homeworkNotifications: data.settings.homeworkNotifications ?? true,
            attendanceNotifications: data.settings.attendanceNotifications ?? true,
            messageNotifications: data.settings.messageNotifications ?? true,
          };
        }
      }
    } catch (error) {
      console.error('Failed to load preferences from backend');
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(`wilma_settings_${userId}`);
    if (stored) {
      const settings = JSON.parse(stored);
      return {
        emailNotifications: settings.emailNotifications ?? true,
        pushNotifications: settings.pushNotifications ?? true,
        gradeNotifications: settings.gradeNotifications ?? true,
        homeworkNotifications: settings.homeworkNotifications ?? true,
        attendanceNotifications: settings.attendanceNotifications ?? true,
        messageNotifications: settings.messageNotifications ?? true,
      };
    }

    // Default: all enabled
    return {
      emailNotifications: true,
      pushNotifications: true,
      gradeNotifications: true,
      homeworkNotifications: true,
      attendanceNotifications: true,
      messageNotifications: true,
    };
  }

  /**
   * Check if notification should be sent based on type and preferences
   */
  private static shouldSendNotification(
    type: string,
    preferences: NotificationPreferences
  ): boolean {
    switch (type) {
      case 'grade':
        return preferences.gradeNotifications;
      case 'homework':
        return preferences.homeworkNotifications;
      case 'attendance':
        return preferences.attendanceNotifications;
      case 'message':
        return preferences.messageNotifications;
      case 'general':
        return true; // Always send general notifications
      default:
        return true;
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(userId: string, notification: any): Promise<void> {
    try {
      await fetch('/api/wilma/send-email-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subject: notification.title,
          message: notification.message,
          type: notification.type
        })
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(userId: string, notification: any): Promise<void> {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return;
    }

    // Check permission
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: notification.id,
      });
    } else if (Notification.permission !== 'denied') {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: notification.id,
        });
      }
    }
  }

  /**
   * Bulk send notifications to multiple users
   */
  static async sendBulkNotifications(
    userIds: string[],
    params: Omit<SendNotificationParams, 'userId'>
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      const success = await this.sendNotification({ ...params, userId });
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send notification when new grade is added
   */
  static async notifyNewGrade(userId: string, courseName: string, grade: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'grade',
      title: 'Uusi arvosana',
      message: `Sait arvosanan ${grade} kurssista ${courseName}`,
      priority: 'high'
    });
  }

  /**
   * Send notification when new homework is assigned
   */
  static async notifyNewHomework(userId: string, title: string, dueDate: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'homework',
      title: 'Uusi tehtävä',
      message: `Uusi tehtävä: ${title}. Palautus: ${dueDate}`,
      priority: 'medium'
    });
  }

  /**
   * Send notification for attendance mark
   */
  static async notifyAttendanceMark(userId: string, markType: string, date: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'attendance',
      title: 'Uusi tuntimerkintä',
      message: `Sait tuntimerkinnän: ${markType} (${date})`,
      priority: 'medium'
    });
  }

  /**
   * Send notification for new message
   */
  static async notifyNewMessage(userId: string, from: string, subject: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'message',
      title: 'Uusi viesti',
      message: `${from}: ${subject}`,
      priority: 'high'
    });
  }
}

export default NotificationService;
