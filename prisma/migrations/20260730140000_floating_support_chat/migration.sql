-- Floating support chat.
--
-- Everything the widget renders lives on the settings singleton, so an operator
-- can turn it off, move it, or rewrite every string without a deploy. The
-- contact links are deliberately NOT duplicated here: the widget reads the same
-- whatsappUrl / telegramUrl the footer and the FAQ button already use.

CREATE TYPE "ChatPosition" AS ENUM ('LEFT', 'RIGHT');

ALTER TABLE "website_settings"
  ADD COLUMN IF NOT EXISTS "chatEnabled"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "chatLogoUrl"      TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "chatTitle"        TEXT    NOT NULL DEFAULT 'FLAZZ GROUP',
  ADD COLUMN IF NOT EXISTS "chatSubtitle"     TEXT    NOT NULL DEFAULT 'Online 24 Jam',
  ADD COLUMN IF NOT EXISTS "chatGreeting"     TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "chatQuickActions" JSONB   NOT NULL DEFAULT '[]';

ALTER TABLE "website_settings"
  ADD COLUMN IF NOT EXISTS "chatPosition" "ChatPosition" NOT NULL DEFAULT 'RIGHT';

-- Seed the existing singleton so the widget is useful the moment it ships,
-- rather than appearing empty until someone visits the settings screen.
UPDATE "website_settings"
SET "chatGreeting" = 'Halo!' || chr(10) ||
                     'Selamat datang di FLAZZ GROUP 👋' || chr(10) || chr(10) ||
                     'Silakan pilih kebutuhan Anda.'
WHERE btrim("chatGreeting") = '';

UPDATE "website_settings"
SET "chatQuickActions" = jsonb_build_array(
  jsonb_build_object(
    'label',   'Top Up Royal Dream',
    'message', 'Halo Admin,' || chr(10) || chr(10) || 'Saya ingin melakukan Top Up Royal Dream.',
    'channel', 'WHATSAPP'
  ),
  jsonb_build_object(
    'label',   'Kendala Pembayaran',
    'message', 'Halo Admin,' || chr(10) || chr(10) || 'Saya mengalami kendala pembayaran.',
    'channel', 'WHATSAPP'
  ),
  jsonb_build_object(
    'label',   'Promo Terbaru',
    'message', 'Halo Admin,' || chr(10) || chr(10) || 'Saya ingin mengetahui promo terbaru.',
    'channel', 'WHATSAPP'
  ),
  jsonb_build_object(
    'label',   'Pertanyaan Lain',
    'message', 'Halo Admin,' || chr(10) || chr(10) || 'Saya ingin bertanya mengenai layanan FLAZZ GROUP.',
    'channel', 'WHATSAPP'
  )
)
WHERE "chatQuickActions" = '[]'::jsonb;
