import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://lvdlolrklzldqkyijntu.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZGxvbHJrbHpsZHFreWlqbnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTYyMjksImV4cCI6MjA5ODYzMjIyOX0.3ychI7oiC9zdatwy6QP8SQTfVI-x6vl4x3NpN53TvBI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
