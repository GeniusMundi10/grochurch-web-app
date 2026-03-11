import { createClient } from './supabase/client';
import { type Session } from '@supabase/supabase-js';
import { Profile } from '@/types';

const supabase = createClient();

export type UserProfile = Profile;

export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

export async function getCurrentUser(): Promise<UserProfile & { plan?: string; trial_days?: number } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || 'User',
        role: 'pastor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      } as UserProfile;
    }

    return {
      ...profile,
      plan: profile.service_plan || 'donation',
      trial_days: 0 // Not implemented in GroChurch
    };

  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

export { supabase };
