/**
 * OAP House Visiting List - Supabase Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://supabase.com and create a free account
 * 2. Create a new project
 * 3. Go to Project Settings → API
 * 4. Copy your Project URL and anon (public) key
 * 5. Replace the placeholder values below
 * 
 * SECURITY NOTE:
 * - Only the ANON (public) key is used here — this is safe for frontend
 * - NEVER put your service_role key here
 * - Row Level Security (RLS) must be enabled to protect data
 */

const SUPABASE_URL = 'https://xdomadqcmdpynexxrxud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkb21hZHFjbWRweW5leHhyeHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjg0ODYsImV4cCI6MjA4Nzk0NDQ4Nn0.i05HTWNpSGuGzdQMiOHKJgjspSgsST2VPjWB5bS-c2M';

// App Configuration
const APP_CONFIG = {
    name: 'OAP House Visiting List',
    version: '1.0.0',
    adminUsername: 'Admin',
    // Admin password is verified server-side via Supabase Auth
    // DO NOT store plain passwords here
};
