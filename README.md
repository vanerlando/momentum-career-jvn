# Momentum — Career HQ

Dashboard pribadi untuk mencatat aktivitas, waktu, jurnal, evaluasi mingguan, program 14 hari, keuangan, dan recap visual.

## Arsitektur data

- `localStorage` tetap dipakai sebagai cache/offline fallback di setiap browser.
- Supabase Auth menyediakan login Google.
- Satu snapshot aplikasi disimpan per pengguna pada `public.momentum_records` dengan `record_type = settings` dan `record_id = app-state-v1`.
- Row Level Security (RLS) membatasi setiap pengguna hanya ke datanya sendiri.

## Menjalankan lokal

```bash
python -m http.server 8080 -d dist
```

Lalu kunjungi `http://localhost:8080`.

## Keamanan

Publishable key Supabase memang dirancang berada di frontend. Jangan pernah menaruh database password atau `service_role` key di repository. Perlindungan data bergantung pada RLS di `supabase/schema.sql`.
