"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser, onAuthStateChange, UserProfile } from "@/lib/auth";

interface UserContextType {
  user: (UserProfile & { plan?: string; trial_days?: number }) | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  isTrialExpired: (user: (UserProfile & { plan?: string; trial_days?: number }) | null) => boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  isTrialExpired: () => false
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(UserProfile & { plan?: string; trial_days?: number }) | null>(null);
  const [loading, setLoading] = useState(true);

  function isTrialExpired(user: (UserProfile & { plan?: string; trial_days?: number }) | null): boolean {
    // Basic implementation for compatibility
    return false;
  }

  const fetchUser = async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Error fetching current user:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = onAuthStateChange(async (session) => {
      if (session) {
        await fetchUser();
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, isTrialExpired }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

export type { UserProfile };
