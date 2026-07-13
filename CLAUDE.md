# CLAUDE.md

## Stack
Next.js 16 (App Router) + React 19 + TypeScript (strict) + Prisma 6 (SQLite — tamamen yerel) + Tailwind v4 + Zod + Vitest.

## Komutlar
- `npm run dev` / `npm run build` / `npm run lint` (her ikisi encoding kontrolü içerir)
- `npm run test` / `npm run test:watch`
- `npm run db:push` / `npm run prisma:generate` / `npm run prisma:seed`

## Klasör Yapısı
- `src/app` — sayfalar (Türkçe kebab-case route adı, örn. `kurum-basvurusu`) ve `src/app/api/**/route.ts` API rotaları.
- `src/components/<domain>` — domain bazlı klasörler; genel UI primitive'leri yalnızca `src/components/ui`.
- `src/lib` — iş mantığı, Prisma sorguları, PDF/docx üretimi, Zod şemaları; `src/lib/api` ortak API yardımcıları (`response`, `errors`, `permissions`).
- `prisma/schema.prisma` — veri modeli (SQLite, `npm run db:push` ile uygulanır).

## Kurallar
- API route handler'ları ince tutulur: iş mantığı `src/lib`'e, hata `handleApiError`'a, yanıt `successResponse`'a, yetki/oran sınırı `requireApiUser` + `enforceRateLimit`'e devredilir — atlanmaz.
- Input doğrulama Zod şemalarıyla yapılır; DB erişimi yalnızca `src/lib/prisma.ts`'teki tekil client üzerinden.
- Önemli `lib` modüllerinin yanında `*.test.ts` bulunur; yeni iş mantığına test eklenir.
- Strict TypeScript, `any` yok; dosya adı kebab-case, bileşen PascalCase, fonksiyon/değişken camelCase.
- Kod/tanımlayıcılar İngilizce; kullanıcıya görünen metin ve yorumlar Türkçe.
- Tailwind utility + `cn()` (`src/lib/utils.ts`); renkler `var(--panel-*)` CSS değişkenleriyle, hardcoded hex yok.
- `"use client"` yalnızca gerçek client-side state/etkileşim gerektiğinde.
- Yeni UI, `src/components/ui`'daki mevcut primitive ve varyantları kullanır; yeni stil sistemi icat edilmez, mevcut tasarım diline sadık kalınır.
- Mevcut dosya/dizin yapısı ve adlandırma kalıpları korunarak genişletilir.

## Tasarım Sistemi (Panel)
Panel monokrom, sade, kompakt bir SaaS dilidir; açık/koyu tema **parite zorunlu**. Aşağıdaki standartlar dışına çıkılmaz, yeni stil sistemi icat edilmez.

**Token'lar (`src/app/globals.css`) — tek renk/yarıçap kaynağı:**
- Yüzey/metin/kenarlık: `var(--panel-bg-canvas|base|elevated|soft|hover)`, `var(--panel-text|-muted|-soft)`, `var(--panel-border|-strong)`, `var(--panel-shadow)`.
- Durum renkleri (yalnızca rozet/uyarı): `var(--panel-{danger,success,warning,info}-bg|-border|-text)`. Durum için ham Tailwind rengi (emerald/amber/rose/sky…) **kullanılmaz** — `Badge` veya bu token'lar kullanılır.
- Yarıçap: `rounded-[var(--panel-radius-card)]` (14px kart), `--panel-radius-lg/md/sm` (12/10/8), pill için `rounded-full`. Keyfi `rounded-[24px]` vb. **yok**.
- **Hardcoded hex/`rgb` yok.** İstisna: doğası gereği sabit marka/veri renkleri (logo, not renkleri, grafik serileri) — onlar da mümkünse token'lanır.

**Primitive zorunluluğu (`src/components/ui`, `src/components/layout`, `src/components/dashboard`):**
- Sayfa başlığı: yalnız `PanelPageIntro` (eyebrow + title + opsiyonel actions/aside). Sayfada ham `text-3xl/4xl` başlık yazılmaz.
- Bölüm başlığı: yalnız `SectionHeading` (H2). Yüzey/kart: yalnız `Card` (`variant`, `padding` prop'ları).
- Metrik/özet kutusu: yalnız `StatCard` (yoğun gridler için `size="sm"`). Satır-içi `border + bg-soft + p-4` stat tile kopyalanmaz.
- Durum etiketi: yalnız `Badge` (`tone="neutral|success|warning|danger|info"`, opsiyonel `dot`). Elle `rounded-full border ...` rozet yazılmaz.
- Buton: yalnız `Button`; form: yalnız `Field` + `inputClassName()`.

**Ölçek ve ritim:**
- Eyebrow: `text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]` (tek tracking standardı: 0.22em).
- Tipografi: sayfa başlığı `PanelPageIntro` (≈text-2xl), bölüm `SectionHeading` (text-lg→xl), kart-içi başlık `text-base`, gövde `text-sm`.
- Boşluk: sayfa kökü `grid gap-5`, kart-içi bölümler `gap-4`, liste/öğeler `gap-3`. Padding `Card` `padding` prop'u ile (sm=p-3, md=p-4, lg=p-5).

**Tema mimarisi (bozma):**
- Açık/koyu `next-themes` ile `data-theme` üzerinden. Açık tema **yalnızca panele** uygulanır; `globals.css`'teki `body:not(:has(.panel-surface))` kuralı landing/giriş/footer'ı koyu tutar.
- `globals.css`'teki "açık tema uyum katmanı" (`.panel-surface` kapsamlı `white/black/neutral/slate` remap'i) panel içindeki sabit utility'leri açığa uyarlar. **Portal/overlay bileşenleri** (toast, confirm-modal, scroll-to-top, vb.) `.panel-surface` dışında render edildiğinden remap onlara ulaşmaz — bunlar **doğrudan token** kullanmak zorundadır.
- Logo `SpeciaLogoBadge variant="auto"` ile temaya göre döner.

## Development Rules
- Bu depo, Specia'nın yalnızca BEP + Değerlendirmeler bölümlerini içeren, tamamen yerel (SQLite, girişsiz) açık kaynak sürümüdür.
- Kimlik doğrulama yoktur: `src/lib/session.ts` sabit yerel kullanıcıyı döndürür; bu mimari korunur.
- Enum'lar SQLite'ta String tutulur; tip tanımları `src/lib/prisma-shim.ts` içindedir, `@prisma/client` yerine oradan import edilir.
- Dışa giden ağ çağrısı eklenmez; sunucu yalnızca 127.0.0.1'i dinler.
- Mevcut API sözleşmeleri ve mimari korunur; büyük refactor öncesi plan sunulur.
- Yalnızca ilgili dosyalar okunur/değiştirilir; mevcut bileşenler yeniden kullanılır.
