-- ============================================================
-- OAP House Visiting List - Supabase Database Schema
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TABLE 1: profiles (extends Supabase auth.users)
-- Stores extra user info: phone, security questions, role
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    security_q1 TEXT,
    security_a1 TEXT,
    security_q2 TEXT,
    security_a2 TEXT,
    security_q3 TEXT,
    security_a3 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: customers
-- Stores all customer records per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    witness_name TEXT,
    mobile TEXT NOT NULL,
    alt_mobile TEXT,
    location TEXT,
    aadhar TEXT,
    cif TEXT,
    account_number TEXT,
    working_fingers TEXT,
    oap_type TEXT DEFAULT 'OAP' CHECK (oap_type IN ('OAP','DAP','KMUT','Others')),
    oap_type_other TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    commission DECIMAL(10,2) DEFAULT 0,
    oap_card_front TEXT,
    oap_card_back TEXT,
    aadhar_front TEXT,
    aadhar_back TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: monthly_records
-- Tracks status per customer per month (Pending/Completed/Skipped)
-- Resets to Pending every new month — history preserved
-- ============================================================
CREATE TABLE IF NOT EXISTS public.monthly_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Completed','Skipped')),
    chance_multiplier INTEGER DEFAULT 1,
    final_chance INTEGER DEFAULT 1,
    done_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, year, month)
);

-- ============================================================
-- TABLE 4: skip_tracking
-- Accumulates skip counts per customer across months
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skip_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    skip_count INTEGER DEFAULT 0,
    last_skipped_month INTEGER,
    last_skipped_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, user_id)
);

-- ============================================================
-- TABLE 5: audit_logs
-- Login/logout/action logs per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 6: app_versions
-- APK version management for the download feature
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number TEXT NOT NULL,
    release_notes TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    platform TEXT DEFAULT 'android' CHECK (platform IN ('android','ios','web')),
    is_latest BOOLEAN DEFAULT TRUE,
    uploaded_by UUID REFERENCES auth.users(id),
    released_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_records_customer ON public.monthly_records(customer_id, year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_records_user ON public.monthly_records(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - MANDATORY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can view all profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================================
-- RLS POLICIES: customers
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own customers" ON public.customers;
CREATE POLICY "Users can manage own customers" ON public.customers
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all customers" ON public.customers;
CREATE POLICY "Admin can view all customers" ON public.customers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================================
-- RLS POLICIES: monthly_records
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own monthly records" ON public.monthly_records;
CREATE POLICY "Users can manage own monthly records" ON public.monthly_records
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all monthly records" ON public.monthly_records;
CREATE POLICY "Admin can view all monthly records" ON public.monthly_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================================
-- RLS POLICIES: skip_tracking
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own skip tracking" ON public.skip_tracking;
CREATE POLICY "Users can manage own skip tracking" ON public.skip_tracking
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: audit_logs
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own logs" ON public.audit_logs;
CREATE POLICY "Users can insert own logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own logs" ON public.audit_logs;
CREATE POLICY "Users can view own logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all logs" ON public.audit_logs;
CREATE POLICY "Admin can view all logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================================
-- RLS POLICIES: app_versions (public read, admin write)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view app versions" ON public.app_versions;
CREATE POLICY "Anyone can view app versions" ON public.app_versions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage app versions" ON public.app_versions;
CREATE POLICY "Admin can manage app versions" ON public.app_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_monthly_records_updated_at BEFORE UPDATE ON public.monthly_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- STORAGE BUCKET: customer-images (for ID uploads)
-- ============================================================
-- Run this after the tables are created
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-images', 'customer-images', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('app-releases', 'app-releases', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: customers images - user can only access own folder
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
CREATE POLICY "Users can upload own images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'customer-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view own images" ON storage.objects;
CREATE POLICY "Users can view own images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'customer-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'customer-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- App releases: public read, admin write
DROP POLICY IF EXISTS "Public can download app releases" ON storage.objects;
CREATE POLICY "Public can download app releases" ON storage.objects
    FOR SELECT USING (bucket_id = 'app-releases');

DROP POLICY IF EXISTS "Admin can upload app releases" ON storage.objects;
CREATE POLICY "Admin can upload app releases" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'app-releases' AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
