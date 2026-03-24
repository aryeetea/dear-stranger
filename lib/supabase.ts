import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kmwpivcnjyakxceogjdl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttd3BpdmNuanlha3hjZW9namRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjM2ODYsImV4cCI6MjA4OTQzOTY4Nn0.8Dv1QNi3-VUc69RcSNIlQJMQzEx6MOXCeahGVfTWBj8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)