
DO $$
DECLARE
  dept_ids uuid[] := ARRAY[
    'd1000000-0000-0000-0000-000000000001'::uuid,
    'd1000000-0000-0000-0000-000000000002'::uuid,
    'd1000000-0000-0000-0000-000000000003'::uuid,
    'd1000000-0000-0000-0000-000000000004'::uuid,
    'd1000000-0000-0000-0000-000000000005'::uuid,
    'd1000000-0000-0000-0000-000000000006'::uuid,
    'd1000000-0000-0000-0000-000000000007'::uuid,
    'd1000000-0000-0000-0000-000000000008'::uuid
  ];
  official_ids uuid[] := ARRAY[
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000004'::uuid,
    'a0000000-0000-0000-0000-000000000005'::uuid,
    'a0000000-0000-0000-0000-000000000006'::uuid,
    'a0000000-0000-0000-0000-000000000007'::uuid,
    'a0000000-0000-0000-0000-000000000008'::uuid
  ];
  official_names text[] := ARRAY[
    'Rajesh Kumar', 'Priya Sharma', 'Suresh Reddy', 'Lakshmi Devi',
    'Venkat Rao', 'Anitha Kumari', 'Srinivas Murthy', 'Kavitha Nair'
  ];
  official_emails text[] := ARRAY[
    'rajesh.roads@gov.test', 'priya.water@gov.test', 'suresh.electricity@gov.test', 'lakshmi.waste@gov.test',
    'venkat.safety@gov.test', 'anitha.parks@gov.test', 'srinivas.health@gov.test', 'kavitha.general@gov.test'
  ];
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
    VALUES (
      official_ids[i],
      '00000000-0000-0000-0000-000000000000'::uuid,
      official_emails[i],
      crypt('TestOfficial123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, name, email, role, department_id)
    VALUES (
      official_ids[i],
      official_names[i],
      official_emails[i],
      'Official'::app_role,
      dept_ids[i]
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
