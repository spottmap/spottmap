import { createClient } from '@supabase/supabase-js';

// シングルトンパターンでSupabaseクライアントを作成
let supabase = null;

export const getSupabaseClient = () => {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return supabase;
};

export default getSupabaseClient();