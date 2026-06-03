import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email?: string | null;
  phone?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('Supabase profile fetch error:', error.message);
    return null;
  }

  return data;
}

export async function upsertProfile(profile: Partial<UserProfile>) {
  return supabase.from('profiles').upsert(profile).select();
}

export async function createProfileIfMissing(user: any, customName?: string) {
  if (!user) {
    return null;
  }

  const profile = await getProfile(user.id);
  if (profile) {
    return profile;
  }

  const displayName = customName ? customName : (user.email ? user.email.split('@')[0] : user.phone ?? 'Usuario');

  const { data, error } = await upsertProfile({
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    display_name: displayName,
  });

  if (error) {
    console.warn('Supabase profile upsert error:', error.message);
    return null;
  }

  return data?.[0] ?? null;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return data.subscription;
}

export async function signOut() {
  return supabase.auth.signOut();
}
