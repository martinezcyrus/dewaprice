import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcsmpkujtfcniynmjyqd.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjc21wa3VqdGZjbml5bm1qeXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTI2NDUsImV4cCI6MjA5NDk2ODY0NX0.gIdJae2uqHVAOfGlGHTTlEOqh4s2vjgXFeOmVxMrr4A';

export const supabase = createClient(supabaseUrl, supabaseKey);
