import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_SIZE ?? 10), idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  async onModuleInit() { await this.migrate(); }
  async onModuleDestroy() { await this.pool.end(); }
  query<T extends QueryResultRow>(text: string, values: unknown[] = []) { return this.pool.query<T>(text, values); }
  async transaction<T>(operation: (client: PoolClient) => Promise<T>) { const client = await this.pool.connect(); try { await client.query('BEGIN'); const result = await operation(client); await client.query('COMMIT'); return result; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } }
  private async migrate() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY, email text UNIQUE NOT NULL, display_name varchar(40) NOT NULL,
        avatar varchar(24) NOT NULL, password_hash text NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(),
        privacy_visibility varchar(24) NOT NULL DEFAULT 'COMPLETION_ONLY',
        reminders_enabled boolean NOT NULL DEFAULT true,
        reduced_motion boolean NOT NULL DEFAULT false,
        email_verified_at timestamptz,
        onboarding_completed boolean NOT NULL DEFAULT false,
        terms_accepted_at timestamptz,
        timezone varchar(64) NOT NULL DEFAULT 'Asia/Jakarta',
        language varchar(8) NOT NULL DEFAULT 'id',
        quiet_start time,
        quiet_end time,
        notification_categories jsonb NOT NULL DEFAULT '{"reminders":true,"circles":true,"milestones":true}'::jsonb,
        location_name varchar(80), latitude double precision, longitude double precision
      );
      CREATE TABLE IF NOT EXISTS refresh_sessions (
        token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        session_id text UNIQUE, device_name text, last_used_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS daily_entries (
        id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, local_date date NOT NULL,
        entry_key text NOT NULL, title text NOT NULL, note text NOT NULL, period varchar(8) NOT NULL,
        kind varchar(16) NOT NULL, current_value integer NOT NULL DEFAULT 0, target_value integer NOT NULL DEFAULT 1,
        unit text, completed boolean NOT NULL DEFAULT false, status varchar(16) NOT NULL DEFAULT 'PENDING', source_label text NOT NULL, source_url text NOT NULL,
        UNIQUE(user_id, local_date, entry_key)
      );
      CREATE TABLE IF NOT EXISTS user_amalan (
        id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_key text, title varchar(100) NOT NULL, note text NOT NULL, period varchar(8) NOT NULL,
        kind varchar(16) NOT NULL, target_value integer NOT NULL DEFAULT 1, unit text,
        source_label text, source_url text, instructions text, active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,template_key)
      );
      CREATE TABLE IF NOT EXISTS bookmarks (
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, amalan_id text NOT NULL REFERENCES user_amalan(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,amalan_id)
      );
      CREATE TABLE IF NOT EXISTS account_tokens (
        token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose varchar(24) NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS daily_mutations (
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, client_mutation_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,client_mutation_id)
      );
      CREATE TABLE IF NOT EXISTS circles (
        id text PRIMARY KEY, owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(60) NOT NULL, type varchar(24) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz,
        test_experience integer
      );
      CREATE TABLE IF NOT EXISTS circle_members (
        circle_id text NOT NULL REFERENCES circles(id) ON DELETE CASCADE, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role varchar(16) NOT NULL DEFAULT 'MEMBER', status varchar(16) NOT NULL DEFAULT 'ACTIVE', joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(circle_id,user_id)
      );
      CREATE TABLE IF NOT EXISTS circle_amalan (
        circle_id text NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
        template_key varchar(80) NOT NULL,
        selected_by text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        position integer NOT NULL DEFAULT 0,
        is_custom boolean NOT NULL DEFAULT false,
        title varchar(100), note varchar(240), period varchar(8), kind varchar(16),
        target_value integer NOT NULL DEFAULT 1, unit varchar(24),
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY(circle_id,template_key)
      );
      CREATE TABLE IF NOT EXISTS challenge_memberships (
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, challenge_id text NOT NULL,
        current_value integer NOT NULL DEFAULT 0, status varchar(16) NOT NULL DEFAULT 'ACTIVE', missed_day_policy varchar(16) NOT NULL DEFAULT 'CONTINUE', joined_at timestamptz NOT NULL DEFAULT now(), paused_at timestamptz, completed_at timestamptz, PRIMARY KEY(user_id,challenge_id)
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL, message text NOT NULL, read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS circle_invites (
        token_hash text PRIMARY KEY, circle_id text NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
        created_by text NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL,
        used_at timestamptz, mode varchar(16) NOT NULL DEFAULT 'PRIVATE', max_uses integer NOT NULL DEFAULT 1,
        use_count integer NOT NULL DEFAULT 0, approval_required boolean NOT NULL DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS circle_activity (
        id text PRIMARY KEY, circle_id text NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
        actor_id text REFERENCES users(id) ON DELETE SET NULL, event_type varchar(32) NOT NULL,
        message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS circle_challenges (
        circle_id text NOT NULL REFERENCES circles(id) ON DELETE CASCADE, challenge_id text NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'ACTIVE', started_by text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
        PRIMARY KEY(circle_id, challenge_id)
      );
      CREATE INDEX IF NOT EXISTS daily_entries_user_date_idx ON daily_entries(user_id, local_date);
      CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS circle_amalan_circle_idx ON circle_amalan(circle_id);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reduced_motion boolean NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone varchar(64) NOT NULL DEFAULT 'Asia/Jakarta';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS language varchar(8) NOT NULL DEFAULT 'id';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_start time;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_end time;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_categories jsonb NOT NULL DEFAULT '{"reminders":true,"circles":true,"milestones":true}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS location_name varchar(80);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude double precision;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude double precision;
      ALTER TABLE users ALTER COLUMN avatar TYPE varchar(24);
      ALTER TABLE refresh_sessions ADD COLUMN IF NOT EXISTS session_id text;
      ALTER TABLE refresh_sessions ADD COLUMN IF NOT EXISTS device_name text;
      ALTER TABLE refresh_sessions ADD COLUMN IF NOT EXISTS last_used_at timestamptz NOT NULL DEFAULT now();
      UPDATE refresh_sessions SET session_id = md5(token_hash || created_at::text) WHERE session_id IS NULL;
      UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS refresh_sessions_session_id_idx ON refresh_sessions(session_id);
      ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'PENDING';
      UPDATE daily_entries SET status='COMPLETED' WHERE completed=true AND status='PENDING';
      ALTER TABLE circles ADD COLUMN IF NOT EXISTS archived_at timestamptz;
      ALTER TABLE circles ADD COLUMN IF NOT EXISTS test_experience integer;
      ALTER TABLE circle_members ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'ACTIVE';
      ALTER TABLE circle_amalan ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
      ALTER TABLE circle_amalan ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;
      ALTER TABLE circle_amalan ADD COLUMN IF NOT EXISTS title varchar(100);
      ALTER TABLE circle_amalan ADD COLUMN IF NOT EXISTS note varchar(240);
      ALTER TABLE circle_amalan ADD COLUMN IF NOT EXISTS period varchar(8);
      ALTER TABLE circle_amalan ADD COLUMN IF NOT EXISTS kind varchar(16);
      ALTER TABLE circle_amalan ADD COLUMN IF NOT EXISTS target_value integer NOT NULL DEFAULT 1;
      ALTER TABLE circle_amalan ADD COLUMN IF NOT EXISTS unit varchar(24);
      ALTER TABLE challenge_memberships ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'ACTIVE';
      ALTER TABLE challenge_memberships ADD COLUMN IF NOT EXISTS missed_day_policy varchar(16) NOT NULL DEFAULT 'CONTINUE';
      ALTER TABLE challenge_memberships ADD COLUMN IF NOT EXISTS paused_at timestamptz;
      ALTER TABLE challenge_memberships ADD COLUMN IF NOT EXISTS completed_at timestamptz;
      ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS mode varchar(16) NOT NULL DEFAULT 'PRIVATE';
      ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1;
      ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;
      ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone varchar(64) NOT NULL DEFAULT 'Asia/Jakarta';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS language varchar(8) NOT NULL DEFAULT 'id';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_start time;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_end time;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_categories jsonb NOT NULL DEFAULT '{"reminders":true,"circles":true,"milestones":true}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS location_name varchar(80);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude double precision;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude double precision;
      ALTER TABLE refresh_sessions ADD COLUMN IF NOT EXISTS session_id text UNIQUE;
      ALTER TABLE refresh_sessions ADD COLUMN IF NOT EXISTS device_name text;
      ALTER TABLE refresh_sessions ADD COLUMN IF NOT EXISTS last_used_at timestamptz NOT NULL DEFAULT now();
      ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'PENDING';
      ALTER TABLE circles ADD COLUMN IF NOT EXISTS archived_at timestamptz;
      ALTER TABLE circle_members ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'ACTIVE';
      ALTER TABLE challenge_memberships ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'ACTIVE';
      ALTER TABLE challenge_memberships ADD COLUMN IF NOT EXISTS missed_day_policy varchar(16) NOT NULL DEFAULT 'CONTINUE';
      ALTER TABLE challenge_memberships ADD COLUMN IF NOT EXISTS paused_at timestamptz;
      ALTER TABLE challenge_memberships ADD COLUMN IF NOT EXISTS completed_at timestamptz;
      ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS mode varchar(16) NOT NULL DEFAULT 'PRIVATE';
      ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1;
      ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;
      ALTER TABLE circle_invites ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false;
      CREATE TABLE IF NOT EXISTS amalan_templates (
        key varchar(80) PRIMARY KEY,
        title varchar(100) NOT NULL,
        note varchar(240) NOT NULL,
        period varchar(8) NOT NULL,
        kind varchar(16) NOT NULL,
        category varchar(40) NOT NULL,
        target_value integer NOT NULL DEFAULT 1,
        unit varchar(24),
        source_label text NOT NULL,
        source_url text NOT NULL,
        instructions text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS challenges (
        id varchar(60) PRIMARY KEY,
        title varchar(100) NOT NULL,
        description text NOT NULL,
        target_value integer NOT NULL DEFAULT 30,
        unit varchar(24) NOT NULL DEFAULT 'hari',
        days_left integer NOT NULL DEFAULT 30,
        icon varchar(16) NOT NULL,
        source_label text NOT NULL,
        source_url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO amalan_templates (key, title, note, period, kind, category, target_value, unit, source_label, source_url, instructions) VALUES
      ('subuh', 'Shalat Subuh', 'Tunaikan shalat wajib', 'PAGI', 'CHECKLIST', 'Wajib / Utama', 1, NULL, 'QS. An-Nisa'' 4:103', 'https://quran.com/4/103', 'Tunaikan sesuai waktu dan tata cara shalat yang kamu pelajari dari sumber tepercaya.'),
      ('dzuhur', 'Shalat Dzuhur', 'Tunaikan shalat wajib', 'SIANG', 'CHECKLIST', 'Wajib / Utama', 1, NULL, 'QS. An-Nisa'' 4:103', 'https://quran.com/4/103', 'Tunaikan sesuai waktu dan tata cara shalat yang kamu pelajari dari sumber tepercaya.'),
      ('ashar', 'Shalat Ashar', 'Tunaikan shalat wajib', 'SORE', 'CHECKLIST', 'Wajib / Utama', 1, NULL, 'QS. An-Nisa'' 4:103', 'https://quran.com/4/103', 'Tunaikan sesuai waktu dan tata cara shalat yang kamu pelajari dari sumber tepercaya.'),
      ('maghrib', 'Shalat Maghrib', 'Tunaikan shalat wajib', 'SORE', 'CHECKLIST', 'Wajib / Utama', 1, NULL, 'QS. An-Nisa'' 4:103', 'https://quran.com/4/103', 'Tunaikan sesuai waktu dan tata cara shalat yang kamu pelajari dari sumber tepercaya.'),
      ('isya', 'Shalat Isya', 'Tunaikan shalat wajib', 'MALAM', 'CHECKLIST', 'Wajib / Utama', 1, NULL, 'QS. An-Nisa'' 4:103', 'https://quran.com/4/103', 'Tunaikan sesuai waktu dan tata cara shalat yang kamu pelajari dari sumber tepercaya.'),
      ('dzikir-pagi', 'Dzikir pagi', 'Pilih bacaan sahih yang mampu dijaga', 'PAGI', 'CHECKLIST', 'Dzikir', 1, NULL, 'Sahih al-Bukhari 6306', 'https://sunnah.com/bukhari:6306', 'Baca dzikir pagi dari himpunan yang telah diperiksa dan sumber penjelasan tepercaya.'),
      ('rawatib-subuh', 'Sunnah qabliyah Subuh', 'Dua rakaat sebelum Subuh', 'PAGI', 'CHECKLIST', 'Shalat Sunnah', 1, NULL, 'Sahih Muslim 728a', 'https://sunnah.com/muslim:728a', 'Dua rakaat sunnah sebelum shalat Subuh.'),
      ('dhuha', 'Shalat Dhuha', 'Mulai dengan dua rakaat', 'PAGI', 'CHECKLIST', 'Shalat Sunnah', 1, NULL, 'Sahih Muslim 720', 'https://sunnah.com/muslim:720', 'Mulai dengan dua rakaat pada waktu Dhuha sesuai tuntunan yang kamu ikuti.'),
      ('quran', 'Membaca Al-Qur''an', 'Tetapkan porsi yang mampu dijaga', 'PAGI', 'QUANTITY', 'Al-Qur''an', 1, 'halaman', 'QS. Al-Muzzammil 73:20', 'https://quran.com/73/20', 'Baca bagian yang mudah dan mampu kamu jaga secara rutin.'),
      ('istighfar', 'Istighfar', 'Memohon ampun dan kembali kepada Allah', 'PAGI', 'COUNTER', 'Dzikir', 100, 'kali', 'Sahih al-Bukhari 6307', 'https://sunnah.com/bukhari:6307', 'Beristighfar dengan sadar dan rendah hati. Target dapat kamu sesuaikan.'),
      ('tasbih', 'Subhanallahi wa bihamdihi', 'Dzikir yang ringan untuk dijaga', 'PAGI', 'COUNTER', 'Dzikir', 100, 'kali', 'Sahih al-Bukhari 6405', 'https://sunnah.com/bukhari:6405', 'Baca dengan tenang. Target dapat kamu sesuaikan dengan kemampuan.'),
      ('shalawat', 'Bershalawat', 'Memohonkan shalawat untuk Nabi ﷺ', 'SORE', 'COUNTER', 'Dzikir', 10, 'kali', 'Sahih Muslim 408', 'https://sunnah.com/muslim:408', 'Bershalawat kepada Nabi ﷺ dengan lafaz yang sahih.'),
      ('dzikir-petang', 'Dzikir petang', 'Luangkan waktu sebelum malam', 'SORE', 'CHECKLIST', 'Dzikir', 1, NULL, 'Sahih al-Bukhari 6306', 'https://sunnah.com/bukhari:6306', 'Baca dzikir petang dari himpunan yang telah diperiksa.'),
      ('kebaikan', 'Satu kebaikan untuk sesama', 'Senyum, membantu, atau berkata baik', 'SIANG', 'CUSTOM', 'Kebaikan Sosial', 1, NULL, 'Jami'' at-Tirmidhi 1956', 'https://sunnah.com/tirmidhi:1956', 'Pilih satu bentuk kebaikan yang aman dan bermanfaat bagi orang lain.'),
      ('witr', 'Shalat Witr', 'Jadikan penutup shalat malam', 'MALAM', 'CHECKLIST', 'Shalat Sunnah', 1, NULL, 'Sunan Abi Dawud 1438', 'https://sunnah.com/abudawud:1438', 'Kerjakan shalat Witr sebagai penutup shalat malam sesuai kemampuan.'),
      ('sedekah', 'Sedekah', 'Berbagi sesuai kemampuan', 'SIANG', 'CHECKLIST', 'Sedekah', 1, NULL, 'QS. Al-Baqarah 2:261', 'https://quran.com/2/261', 'Berikan sedekah secara aman, ikhlas, dan sesuai kemampuan.'),
      ('belajar', 'Belajar ilmu bermanfaat', 'Luangkan waktu untuk belajar', 'SIANG', 'DURATION', 'Ilmu', 10, 'menit', 'Sahih Muslim 2699', 'https://sunnah.com/muslim:2699', 'Pelajari ilmu agama atau ilmu bermanfaat dari pengajar dan sumber tepercaya.'),
      ('tahajjud', 'Shalat Tahajjud', 'Shalat sunnah di sepertiga malam terakhir', 'MALAM', 'CHECKLIST', 'Shalat Sunnah', 1, NULL, 'Sahih Muslim 1163', 'https://sunnah.com/muslim:1163', 'Laksanakan minimal dua rakaat pada sepertiga malam terakhir setelah bangun tidur.'),
      ('rawatib-dzuhur', 'Sunnah ba''diyah Dzuhur', 'Dua rakaat sesudah shalat Dzuhur', 'SIANG', 'CHECKLIST', 'Shalat Sunnah', 1, NULL, 'Sahih Muslim 728a', 'https://sunnah.com/muslim:728a', 'Dua rakaat sunnah rawatib sesudah shalat Dzuhur.'),
      ('rawatib-maghrib', 'Sunnah ba''diyah Maghrib', 'Dua rakaat sesudah shalat Maghrib', 'SORE', 'CHECKLIST', 'Shalat Sunnah', 1, NULL, 'Sahih Muslim 728a', 'https://sunnah.com/muslim:728a', 'Dua rakaat sunnah rawatib sesudah shalat Maghrib.'),
      ('rawatib-isya', 'Sunnah ba''diyah Isya', 'Dua rakaat sesudah shalat Isya', 'MALAM', 'CHECKLIST', 'Shalat Sunnah', 1, NULL, 'Sahih Muslim 728a', 'https://sunnah.com/muslim:728a', 'Dua rakaat sunnah rawatib sesudah shalat Isya.'),
      ('dzikir-shalat', 'Dzikir setelah shalat fardhu', 'Istighfar, Ayat Kursi, dan tasbih-tahmid-takbir 33x', 'SIANG', 'CHECKLIST', 'Dzikir', 1, NULL, 'Sahih Muslim 597a', 'https://sunnah.com/muslim:597a', 'Membaca istighfar, dzikir ma''tsur, Ayat Kursi, serta tasbih, tahmid, dan takbir 33 kali seusai shalat fardhu.'),
      ('al-mulk', 'Membaca Surat Al-Mulk', 'Pelindung dan pemberi syafaat sebelum tidur', 'MALAM', 'CHECKLIST', 'Al-Qur''an', 1, 'surat', 'Jami'' at-Tirmidhi 2891', 'https://sunnah.com/tirmidhi:2891', 'Membaca Surat Al-Mulk (30 ayat) pada malam hari sebelum tidur.'),
      ('doa-tidur', 'Dzikir & doa sebelum tidur', 'Ayat Kursi, 3 Qul, dan doa tidur', 'MALAM', 'CHECKLIST', 'Dzikir', 1, NULL, 'Sahih al-Bukhari 6320', 'https://sunnah.com/bukhari:6320', 'Membaca Ayat Kursi, Surat Al-Ikhlas, Al-Falaq, An-Nas, serta doa Bismika Allahumma amutu wa ahya.'),
      ('tahlil', 'Tahlil 100x', 'Laa ilaha illallah wahdahu laa syarika lah...', 'PAGI', 'COUNTER', 'Dzikir', 100, 'kali', 'Sahih al-Bukhari 3293', 'https://sunnah.com/bukhari:3293', 'Membaca lafaz tauhid lengkap 100 kali sebagai benteng perlindungan dan pelebur dosa.'),
      ('doa-ortu', 'Mendoakan orang tua', 'Rabbighfir li wa liwalidayya warhamhuma', 'PAGI', 'CHECKLIST', 'Doa', 1, NULL, 'QS. Al-Isra'' 17:24', 'https://quran.com/17/24', 'Mendoakan ampunan, rahmat, dan keberkahan untuk kedua orang tua setiap hari.'),
      ('puasa-sunnah', 'Puasa sunnah', 'Senin-Kamis atau Ayyamul Bidh (13-15)', 'PAGI', 'CHECKLIST', 'Puasa', 1, 'hari', 'Jami'' at-Tirmidhi 745', 'https://sunnah.com/tirmidhi:745', 'Niatkan puasa sunnah di hari Senin, Kamis, atau tiga hari tengah bulan hijriyah.'),
      ('silaturahmi', 'Menyapa & menjalin silaturahmi', 'Tanyakan kabar orang tua, keluarga, atau kerabat', 'SIANG', 'CHECKLIST', 'Kebaikan Sosial', 1, NULL, 'Sahih al-Bukhari 5985', 'https://sunnah.com/bukhari:5985', 'Hubungi atau temui keluarga dan kerabat untuk mempererat tali persaudaraan.'),
      ('menjaga-wudhu', 'Menjaga keadaan suci (wudhu)', 'Memperbarui wudhu saat berhadats', 'PAGI', 'CHECKLIST', 'Thaharah', 1, NULL, 'Musnad Ahmad 22433', 'https://sunnah.com/ahmad:22433', 'Membiasakan diri senantiasa dalam keadaan suci dengan berwudhu kembali ketika batal.')
      ON CONFLICT (key) DO UPDATE SET
        title = EXCLUDED.title, note = EXCLUDED.note, period = EXCLUDED.period, kind = EXCLUDED.kind,
        category = EXCLUDED.category, target_value = EXCLUDED.target_value, unit = EXCLUDED.unit,
        source_label = EXCLUDED.source_label, source_url = EXCLUDED.source_url, instructions = EXCLUDED.instructions;

      INSERT INTO challenges (id, title, description, target_value, unit, days_left, icon, source_label, source_url) VALUES
      ('dhuha-30', '30 Hari Dhuha', 'Jaga konsistensi dhuha 2 rakaat. Hari terlewat tidak membatalkan kebaikan yang sudah dicatat.', 30, 'hari', 30, '☀', 'Sahih Muslim 720', 'https://sunnah.com/muslim:720'),
      ('quran-30', '30 Hari Bersama Al-Qur''an', 'Membaca minimal satu halaman setiap hari untuk menjaga kedekatan hati dengan kalamullah.', 30, 'hari', 30, '◇', 'QS. Al-Muzzammil 73:20', 'https://quran.com/73/20'),
      ('istighfar-30', '30 Hari Istighfar', 'Membiasakan lisan bertobat dan memohon ampunan setiap malam menjelang tidur.', 30, 'hari', 30, '✦', 'Sahih al-Bukhari 6307', 'https://sunnah.com/bukhari:6307')
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description, target_value = EXCLUDED.target_value,
        unit = EXCLUDED.unit, days_left = EXCLUDED.days_left, icon = EXCLUDED.icon,
        source_label = EXCLUDED.source_label, source_url = EXCLUDED.source_url;

      CREATE TABLE IF NOT EXISTS encouragement_templates (
        key varchar(40) PRIMARY KEY,
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS journey_milestones (
        day integer PRIMARY KEY,
        title varchar(100) NOT NULL,
        icon varchar(16) NOT NULL,
        description text NOT NULL,
        reflection text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO encouragement_templates (key, message) VALUES
      ('ease', 'Semoga Allah mudahkan harimu.'),
      ('continue', 'Yuk, lanjutkan perjalanan hari ini.'),
      ('little', 'Sedikit demi sedikit, tetap berarti.'),
      ('steadfast', 'Semoga Allah menjaga istiqamah kita.'),
      ('goodness', 'Semoga hari ini penuh kebaikan.')
      ON CONFLICT (key) DO UPDATE SET message = EXCLUDED.message;

      INSERT INTO journey_milestones (day, title, icon, description, reflection) VALUES
      (1, 'Lentera Istiqamah', '🏮', 'Cahaya kebersamaan pertama dinyalakan di taman Circle.', 'Langkah awal yang dijaga bersama bernilai kebaikan yang berlipat.'),
      (3, 'Mata Air Kesejukan', '💧', 'Tiga hari aktif mengalirkan ketenangan dan keteduhan niat.', 'Menyiram niat dengan keikhlasan setiap hari.'),
      (7, 'Taman Berbunga', '🌸', 'Satu pekan kebersamaan; bunga-bunga hikmah mulai mekar semerbak.', 'Konsistensi membuat perjalanan terasa ringan dan berkah.'),
      (14, 'Pohon Rindang', '🌳', 'Dua pekan konsistensi menaungi dan menguatkan langkah setiap anggota.', 'Kebersamaan bagai satu bangunan yang saling menopang.'),
      (30, 'Paviliun Cahaya Emas', '🕌', 'Tiga puluh hari aktif bersama menyempurnakan keindahan oasis spiritual.', 'Segala puji bagi Allah yang senantiasa menjaga keistiqamahan kita.')
      ON CONFLICT (day) DO UPDATE SET
        title = EXCLUDED.title, icon = EXCLUDED.icon, description = EXCLUDED.description, reflection = EXCLUDED.reflection;

      CREATE TABLE IF NOT EXISTS collective_milestones (
        level integer PRIMARY KEY,
        title varchar(100) NOT NULL,
        desc_text text NOT NULL,
        reflection text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO collective_milestones (level, title, desc_text, reflection) VALUES
      (1, 'Lentera Istiqamah', 'Cahaya kebersamaan pertama menyala di taman Circle.', 'Satu langkah kecil dapat menjadi awal perjalanan yang panjang.'),
      (2, 'Mata Air Kesejukan', 'Mata air jernih hadir sebagai tanda langkah yang terus dijaga.', 'Kebaikan yang dirawat bersama menghadirkan ketenangan.'),
      (3, 'Gerbang Bunga', 'Gerbang bunga membuka kawasan baru di taman bersama.', 'Setiap kontribusi membuat ruang bersama semakin hidup.'),
      (4, 'Pohon Lentera', 'Pohon rindang bertabur cahaya menjadi tempat bernaung anggota Circle.', 'Kebersamaan menguatkan tanpa perlu membandingkan.'),
      (5, 'Paviliun Biru', 'Paviliun pertama berdiri sebagai pusat taman yang bertumbuh.', 'Konsistensi kolektif melahirkan sesuatu yang indah.'),
      (7, 'Jembatan Bulan', 'Jembatan bercahaya menghubungkan dua sisi taman Circle.', 'Setiap anggota mengambil bagian dalam perjalanan yang sama.'),
      (10, 'Observatorium Bintang', 'Menara pengamatan membuka langit malam yang penuh cahaya.', 'Tetaplah melihat tujuan dengan harapan dan kerendahan hati.'),
      (15, 'Gerbang Cahaya Emas', 'Gerbang utama taman terbuka dengan pancaran cahaya hangat.', 'Capaian ini lahir dari banyak langkah yang dilakukan bersama.'),
      (20, 'Perpustakaan Hikmah', 'Ruang ilmu dan perenungan melengkapi taman Circle.', 'Ilmu yang bermanfaat menuntun amal agar semakin baik.'),
      (30, 'Taman Agung Bercahaya', 'Seluruh kawasan utama taman bersinar sebagai pencapaian tertinggi saat ini.', 'Syukuri perjalanan bersama dan teruslah bertumbuh dengan lembut.')
      ON CONFLICT (level) DO UPDATE SET
        title = EXCLUDED.title, desc_text = EXCLUDED.desc_text, reflection = EXCLUDED.reflection;

      DELETE FROM refresh_sessions WHERE expires_at < now();
      DELETE FROM account_tokens WHERE expires_at < now() OR used_at IS NOT NULL;
    `);
  }
}
