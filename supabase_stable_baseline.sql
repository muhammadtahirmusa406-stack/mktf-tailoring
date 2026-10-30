-- MKTF Tailoring Stable Catalog Schema & Permissions
-- Target Tables: sewing_styles, embroidery_designs, profiles, storage

-- 1. Ensure storage buckets exist and are public
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog', 'catalog', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Non-recursive, stable policies
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE sewing_styles DISABLE ROW LEVEL SECURITY;
ALTER TABLE embroidery_designs DISABLE ROW LEVEL SECURITY;

-- 3. Upsert Constraints
-- sewing_styles: UNIQUE(name)
-- embroidery_designs: UNIQUE(code)