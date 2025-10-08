"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useNotifications(organizationId?: Id<"organizations">) {
  // Get user notifications
  const notifications = useQuery(api.notifications.getUserNotifications, {
    organizationId,
    limit: 50,
  });

  // Get unread count
  const unreadCount = useQuery(api.notifications.getUnreadNotificationCount, {
    organizationId,
  });

  // Mark notification as read
  const markAsRead = useMutation(api.notifications.markNotificationAsRead);

  // Mark all notifications as read
  const markAllAsRead = useMutation(api.notifications.markAllNotificationsAsRead);

  // Delete notification
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
    markAsRead: (notificationId: Id<"notifications">) => 
      markAsRead({ notificationId }),
    markAllAsRead: () => 
      markAllAsRead({ organizationId }),
    deleteNotification: (notificationId: Id<"notifications">) => 
      deleteNotification({ notificationId }),
    isLoading: notifications === undefined,
  };
}

export function useUnreadNotificationCount(organizationId?: Id<"organizations">) {
  return useQuery(api.notifications.getUnreadNotificationCount, {
    organizationId,
  }) || 0;
}