"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Notification {
  id: string;
  content: string;
  unread: boolean;
  time: string;
  icon?: React.ReactNode;
  conversation_id?: string;
  link?: string;
  type?: 'message' | 'booking' | 'other';
  customer_name?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notif: Omit<Notification, "id" | "unread" | "time">) => void;
  markAllRead: () => void;
  markAsRead: (id: string, conversation_id?: string) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications] = useState<Notification[]>([]);
  const loading = false;

  const addNotification = () => {};
  const markAllRead = () => {};
  const markAsRead = () => {};
  const refetch = async () => {};

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAllRead, markAsRead, loading, refetch }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [],
      addNotification: () => {},
      markAllRead: () => {},
      markAsRead: () => {},
      loading: false,
      refetch: async () => {},
    };
  }
  return ctx;
}
