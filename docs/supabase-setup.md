# BlockVault — Supabase Setup Guide

## 1. Create Project

1. Go to supabase.com and create a new project
2. Note your project URL and anon key
3. Note the service role key (for server-side API)

## 2. Database Tables

Run these SQL migrations in the Supabase SQL editor:

```sql
-- Users / profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL DEFAULT ('bv_' || encode(gen_random_bytes(24), 'hex')),
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'solo', 'agency')),
    block_limit INTEGER NOT NULL DEFAULT 10,
    site_limit INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocks table
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    markup TEXT NOT NULL,
    category TEXT DEFAULT '',
    block_count INTEGER DEFAULT 1,
    thumbnail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_user_id ON blocks(user_id);
CREATE INDEX idx_blocks_category ON blocks(user_id, category);

-- Images table (for v2 image sync)
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    cloud_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_images_block_id ON images(block_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER blocks_updated_at
    BEFORE UPDATE ON blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## 3. Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
-- (API key auth is handled at the API layer, not Supabase Auth)
CREATE POLICY "Service role full access on profiles"
    ON profiles FOR ALL
    USING (true)
    WITH CHECK (true);

-- Blocks: service role manages access (API validates API key)
CREATE POLICY "Service role full access on blocks"
    ON blocks FOR ALL
    USING (true)
    WITH CHECK (true);

-- Images: service role manages access
CREATE POLICY "Service role full access on images"
    ON images FOR ALL
    USING (true)
    WITH CHECK (true);
```

Note: Since we use API key auth (not Supabase Auth), RLS policies are
permissive and the Express API handles authorization by looking up the
API key and filtering queries by user_id.

## 4. API Key Authentication Flow

1. User registers via `POST /auth/register` with email + password
2. API creates a profile row with auto-generated `api_key`
3. User enters `api_key` in WordPress plugin settings
4. Every API request includes `X-API-Key` header
5. API middleware looks up profile by api_key to get user_id
6. All queries are scoped to that user_id

## 5. Plan Limits

| Plan   | Price     | Block Limit | Site Limit | Image Sync |
|--------|-----------|-------------|------------|------------|
| free   | $0/month  | 5           | 1          | No         |
| solo   | $9/month  | Unlimited   | 3          | Yes        |
| agency | $19/month | Unlimited   | Unlimited  | Yes        |

Enforcement happens at the API layer:
- `POST /blocks`: check block count against `block_limit`
- Image sync endpoints: check `plan` is 'solo' or 'agency'

## 6. Storage (v2 — Image Sync)

Create a Supabase Storage bucket or use Cloudflare R2:

```sql
-- If using Supabase Storage:
INSERT INTO storage.buckets (id, name, public)
VALUES ('block-images', 'block-images', true);
```

For Cloudflare R2 (recommended — no egress fees):
1. Create an R2 bucket named `blockvault-images`
2. Set up a custom domain or use the R2 public URL
3. Store R2 credentials in API environment variables

## 7. Environment Variables (for the Express API)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=3000
```
