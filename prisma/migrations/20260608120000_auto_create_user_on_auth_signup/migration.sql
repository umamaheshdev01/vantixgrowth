-- Trigger: whenever a user is created in Supabase Auth (auth.users),
-- automatically insert a matching row into public.users.
-- Role defaults to 'admin' since users are only added manually by the owner.
-- To create an employee instead, set raw_user_meta_data: { "role": "employee" }
-- in the Supabase Auth dashboard before creating the user.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    email,
    password_hash,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    '__SUPABASE_MANAGED__',
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')::"Role",
    'active'::"UserStatus",
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
