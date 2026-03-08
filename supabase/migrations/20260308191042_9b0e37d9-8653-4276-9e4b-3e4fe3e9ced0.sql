
INSERT INTO public.profiles (id, name, email, role, department_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Rajesh Kumar', 'rajesh.roads@gov.test', 'Official', 'd1000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'Priya Sharma', 'priya.water@gov.test', 'Official', 'd1000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000003', 'Suresh Reddy', 'suresh.electricity@gov.test', 'Official', 'd1000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000004', 'Lakshmi Devi', 'lakshmi.waste@gov.test', 'Official', 'd1000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000005', 'Venkat Rao', 'venkat.safety@gov.test', 'Official', 'd1000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000006', 'Anitha Kumari', 'anitha.parks@gov.test', 'Official', 'd1000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000007', 'Srinivas Murthy', 'srinivas.health@gov.test', 'Official', 'd1000000-0000-0000-0000-000000000007'),
  ('a0000000-0000-0000-0000-000000000008', 'Kavitha Nair', 'kavitha.general@gov.test', 'Official', 'd1000000-0000-0000-0000-000000000008')
ON CONFLICT (id) DO NOTHING;
