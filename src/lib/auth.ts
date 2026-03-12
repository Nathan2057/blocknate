import { supabase } from "./supabase";

export async function getUser() {
  const { data: { user } } = await supabase!.auth.getUser();
  return user;
}

export async function signOut() {
  await supabase!.auth.signOut();
}

export function onAuthStateChange(callback: (user: unknown) => void) {
  return supabase!.auth.onAuthStateChange((_, session) => {
    callback(session?.user ?? null);
  });
}
