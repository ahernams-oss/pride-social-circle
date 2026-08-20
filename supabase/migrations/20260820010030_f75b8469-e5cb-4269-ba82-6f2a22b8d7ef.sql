
DO $$
DECLARE uid uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dev@lionsconnecta.app') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'dev@lionsconnecta.app', crypt('dev123456', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Desenvolvedor DEV"}'::jsonb, now(), now()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, json_build_object('sub', uid::text, 'email', 'dev@lionsconnecta.app')::jsonb, 'email', uid::text, now(), now(), now());
  ELSE
    SELECT id INTO uid FROM auth.users WHERE email = 'dev@lionsconnecta.app';
  END IF;

  INSERT INTO public.profiles (id, full_name, status)
  VALUES (uid, 'Desenvolvedor DEV', 'approved')
  ON CONFLICT (id) DO UPDATE SET status = 'approved', full_name = 'Desenvolvedor DEV';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
END $$;
