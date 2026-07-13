import { getAppUrl, getLegalContactEmail, LEGAL_BRAND_NAME } from "@/lib/legal";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getLoginUrl() {
  return new URL("/giris", getAppUrl()).toString();
}

function getPasswordResetUrl(token: string) {
  const url = new URL("/sifre-sifirla", getAppUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

function getHomeUrl() {
  return getAppUrl();
}

function buildEmailFrame(title: string, intro: string, body: string, ctaLabel: string, ctaUrl: string) {
  return `
    <div style="background:#050505;padding:32px 16px;font-family:Arial,sans-serif;color:#f5f5f5;">
      <div style="max-width:620px;margin:0 auto;background:#0f0f0f;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#737373;">
          ${LEGAL_BRAND_NAME}
        </p>
        <h1 style="margin:0 0 16px;font-size:30px;line-height:1.15;color:#ffffff;">${title}</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#d4d4d4;">${intro}</p>
        <div style="font-size:15px;line-height:1.8;color:#d4d4d4;">${body}</div>
        <p style="margin:28px 0 0;">
          <a href="${ctaUrl}" style="display:inline-block;padding:14px 20px;border-radius:14px;background:#ffffff;color:#050505;text-decoration:none;font-weight:700;">
            ${ctaLabel}
          </a>
        </p>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.8;color:#8a8a8a;">
          Sorulariniz için ${escapeHtml(getLegalContactEmail())} adresine yazabilirsiniz.
        </p>
      </div>
    </div>
  `.trim();
}

export function buildWelcomeEmail(name: string) {
  const safeName = escapeHtml(name);
  const loginUrl = getLoginUrl();

  return {
    subject: "Specia hesabiniz hazir",
    text: [
      `Merhaba ${name},`,
      "",
      "Specia hesabiniz olusturuldu.",
      `Giriş yapmak için: ${loginUrl}`,
      "",
      `Destek: ${getLegalContactEmail()}`,
    ].join("\n"),
    html: buildEmailFrame(
      "Hesabiniz hazir",
      `Merhaba ${safeName}, Specia hesabiniz olusturuldu.`,
      "<p>Artik platforma giris yaparak ogrenci, BEP ve PDF sureclerinizi yonetebilirsiniz.</p>",
      "Giriş Yap",
      loginUrl,
    ),
  };
}

export function buildRegistrationVerificationEmail(name: string, code: string) {
  const safeName = escapeHtml(name);
  const loginUrl = getLoginUrl();

  return {
    subject: "Specia kayıt doğrulama kodunuz",
    text: [
      `Merhaba ${name},`,
      "",
      "Specia kaydinizi tamamlamak için 6 haneli doğrulama kodunuz:",
      code,
      "",
      "Bu kod 10 dakika boyunca gecerlidir.",
      `Giriş sayfasi: ${loginUrl}`,
      "",
      `Destek: ${getLegalContactEmail()}`,
    ].join("\n"),
    html: buildEmailFrame(
      "Kaydinizi dogrulayin",
      `Merhaba ${safeName}, kaydinizi tamamlamak için asagidaki 6 haneli kodu kullanin.`,
      `<p style="margin:0 0 16px;">Kodunuz:</p><p style="margin:0 0 24px;font-size:34px;font-weight:700;letter-spacing:0.32em;color:#ffffff;">${escapeHtml(code)}</p><p>Bu kod 10 dakika boyunca gecerlidir. Bu istegi siz yapmadiysaniz bu e-postayi dikkate almayabilirsiniz.</p>`,
      "Giriş Sayfasini Ac",
      loginUrl,
    ),
  };
}

export function buildAdminCreatedAccountEmail(name: string) {
  const safeName = escapeHtml(name);
  const loginUrl = getLoginUrl();

  return {
    subject: "Specia hesabiniz yonetici tarafından olusturuldu",
    text: [
      `Merhaba ${name},`,
      "",
      "Specia hesabiniz bir yonetici tarafından olusturuldu.",
      "Giriş bilgileri veya ilk sifreniz için kurum yoneticinizle iletişime gecin.",
      `Giriş sayfasi: ${loginUrl}`,
      "",
      `Destek: ${getLegalContactEmail()}`,
    ].join("\n"),
    html: buildEmailFrame(
      "Hesabiniz olusturuldu",
      `Merhaba ${safeName}, hesabiniz yonetici tarafından olusturuldu.`,
      "<p>Ilk sifreniz veya erisim ayrintilariniz icin kurum yoneticinizle iletisime gecin. Hesabiniz aktif oldugunda giris ekranindan oturum acabilirsiniz.</p>",
      "Giriş Sayfasini Ac",
      loginUrl,
    ),
  };
}

export function buildPasswordResetEmail(name: string, token: string) {
  const safeName = escapeHtml(name);
  const resetUrl = getPasswordResetUrl(token);

  return {
    subject: "Specia şifre sifirlama baglantiniz",
    text: [
      `Merhaba ${name},`,
      "",
      "Specia hesabiniz için şifre sifirlama talebi aldik.",
      `Yeni şifre belirlemek için bu bağlantıyı acin: ${resetUrl}`,
      "Bu bağlantı 1 saat boyunca gecerlidir.",
      "",
      `Destek: ${getLegalContactEmail()}`,
    ].join("\n"),
    html: buildEmailFrame(
      "Sifrenizi yenileyin",
      `Merhaba ${safeName}, sifrenizi yenilemek için asagidaki bağlantıyı kullanabilirsiniz.`,
      "<p>Bu baglanti tek kullanimliktir ve 1 saat icinde gecerliligini kaybeder. Bu istegi siz yapmadiysaniz bu e-postayi dikkate almayabilirsiniz.</p>",
      "Sifremi Yenile",
      resetUrl,
    ),
  };
}

export function buildInstitutionApplicationReceivedEmail(
  contactName: string,
  institutionName: string,
) {
  const safeName = escapeHtml(contactName);
  const safeInstitutionName = escapeHtml(institutionName);
  const homeUrl = getHomeUrl();

  return {
    subject: "Specia kurum başvurunuz değerlendirmeye alindi",
    text: [
      `Merhaba ${contactName},`,
      "",
      `${institutionName} adina ilettiginiz kurum basvurusu kayda alindi.`,
      "Başvurunuz inceleme sirasina alinmistir. Değerlendirme tamamlandiginda size tekrar bilgi verilecektir.",
      `Platform: ${homeUrl}`,
      "",
      `Destek: ${getLegalContactEmail()}`,
    ].join("\n"),
    html: buildEmailFrame(
      "Başvurunuz alindi",
      `Merhaba ${safeName}, ${safeInstitutionName} adina ilettiginiz kurum basvurusu değerlendirmeye alindi.`,
      "<p>Ekibimiz basvurunuzu incelemeye basladi. Degerlendirme tamamlandiginda sonucu e-posta ile sizinle paylasacagiz.</p>",
      "Specia'yi Incele",
      homeUrl,
    ),
  };
}

export function buildInstitutionApplicationStatusEmail(input: {
  contactName: string;
  institutionName: string;
  status: "reviewing" | "approved" | "rejected";
  adminNotes?: string | null;
}) {
  const safeName = escapeHtml(input.contactName);
  const safeInstitutionName = escapeHtml(input.institutionName);
  const safeAdminNotes = input.adminNotes ? escapeHtml(input.adminNotes) : "";
  const homeUrl = getHomeUrl();

  const content = {
    reviewing: {
      subject: "Specia kurum başvurunuz inceleniyor",
      title: "Başvurunuz inceleniyor",
      intro: `Merhaba ${safeName}, ${safeInstitutionName} için ilettiginiz başvuru aktif inceleme asamasina alindi.`,
      body: `<p>Başvurunuz kurum ekibimiz tarafından ayrintili olarak degerlendiriliyor. Sonuc netlestiginde size yeni bir bilgilendirme gonderecegiz.</p>${
        safeAdminNotes ? `<p><strong>Admin notu:</strong> ${safeAdminNotes}</p>` : ""
      }`,
      ctaLabel: "Specia'yi Incele",
    },
    approved: {
      subject: "Specia kurum başvurunuz onaylandi",
      title: "Başvurunuz onaylandi",
      intro: `Merhaba ${safeName}, ${safeInstitutionName} için ilettiginiz kurum basvurusu onaylandi.`,
      body: `<p>Ekibimiz kısa süre içinde sizinle iletişime gecerek hesap aktivasyonu ve sonraki adimlari paylasacaktir.</p>${
        safeAdminNotes ? `<p><strong>Admin notu:</strong> ${safeAdminNotes}</p>` : ""
      }`,
      ctaLabel: "Specia'yi Ziyaret Et",
    },
    rejected: {
      subject: "Specia kurum başvurunuz hakkinda bilgilendirme",
      title: "Başvuru sonucu paylasildi",
      intro: `Merhaba ${safeName}, ${safeInstitutionName} için ilettiginiz kurum basvurusu bu asamada onaylanmadi.`,
      body: `<p>Değerlendirme sonucu bu donemde olumlu ilerleyemedik. Dilerseniz güncel bilgilerle yeniden başvuru iletebilirsiniz.</p>${
        safeAdminNotes ? `<p><strong>Admin notu:</strong> ${safeAdminNotes}</p>` : ""
      }`,
      ctaLabel: "Specia'yi Incele",
    },
  }[input.status];

  return {
    subject: content.subject,
    text: [
      `Merhaba ${input.contactName},`,
      "",
      `${input.institutionName} için kurum basvurunuzun durumu: ${input.status}.`,
      input.status === "approved"
        ? "Başvurunuz onaylandi. Ekibimiz sonraki adimlar için sizinle iletişime gececek."
        : input.status === "rejected"
          ? "Başvurunuz bu asamada onaylanmadi."
          : "Başvurunuz aktif inceleme asamasina alindi.",
      input.adminNotes ? `Admin notu: ${input.adminNotes}` : "",
      `Platform: ${homeUrl}`,
      "",
      `Destek: ${getLegalContactEmail()}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildEmailFrame(
      content.title,
      content.intro,
      content.body,
      content.ctaLabel,
      homeUrl,
    ),
  };
}

export function buildUserSuspendedEmail(name: string, isActive: boolean, suspendedUntil?: Date | null) {
  const safeName = escapeHtml(name);
  const homeUrl = getHomeUrl();
  const dateStr = suspendedUntil
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(suspendedUntil))
    : null;

  const subject = dateStr
    ? "Specia hesabınız askıya alındı"
    : isActive
      ? "Specia hesabınız tekrar aktif edildi"
      : "Specia hesabınız donduruldu";

  const title = dateStr
    ? "Hesabınız Geçici Olarak Askıya Alındı"
    : isActive
      ? "Hesabınız Aktif Edildi"
      : "Hesabınız Donduruldu";

  const intro = `Merhaba ${safeName},`;

  const body = dateStr
    ? `<p>Hesabınız yöneticilerimiz tarafından güvenlik veya sistem kuralları gereği <strong>${dateStr}</strong> tarihine kadar geçici olarak askıya alınmıştır. Bu tarihten sonra hesabınız otomatik olarak tekrar aktif hale gelecektir.</p>`
    : isActive
      ? `<p>Hesabınız tekrar aktif duruma getirilmiştir. Platformu aktif olarak kullanmaya devam edebilirsiniz.</p>`
      : `<p>Hesabınız yöneticilerimiz tarafından süresiz olarak pasif duruma getirilmiştir.</p>`;

  return {
    subject,
    text: [
      `Merhaba ${name},`,
      "",
      dateStr
        ? `Hesabınız ${dateStr} tarihine kadar geçici olarak askıya alınmıştır.`
        : isActive
          ? "Hesabınız tekrar aktif duruma getirilmiştir."
          : "Hesabınız süresiz olarak dondurulmuştur.",
      "",
      `Destek: ${getLegalContactEmail()}`,
    ].join("\n"),
    html: buildEmailFrame(
      title,
      intro,
      body,
      isActive ? "Giriş Yap" : "Platformu İncele",
      homeUrl,
    ),
  };
}

export function buildTwoFactorVerificationEmail(name: string, code: string) {
  const safeName = escapeHtml(name);
  const loginUrl = getLoginUrl();

  return {
    subject: "Specia giriş doğrulama kodunuz (2FA)",
    text: [
      `Merhaba ${name},`,
      "",
      "Hesabınıza giriş yapmak için iki adımlı doğrulama (2FA) kodunuz:",
      code,
      "",
      "Bu kod 5 dakika boyunca geçerlidir.",
      "",
      `Destek: ${getLegalContactEmail()}`,
    ].join("\n"),
    html: buildEmailFrame(
      "Giriş Doğrulama Kodu",
      `Merhaba ${safeName}, hesabınıza güvenli giriş yapmak için aşağıdaki 6 haneli kodu kullanın.`,
      `<p style="margin:0 0 16px;">Kodunuz:</p><p style="margin:0 0 24px;font-size:34px;font-weight:700;letter-spacing:0.32em;color:#ffffff;">${escapeHtml(code)}</p><p>Bu kod 5 dakika boyunca geçerlidir. Bu işlemi siz başlatmadıysanız lütfen hesap şifrenizi değiştirin.</p>`,
      "Giriş Sayfası",
      loginUrl,
    ),
  };
}

export function buildAccountDeletedEmail(name: string) {
  const safeName = escapeHtml(name);
  const homeUrl = getHomeUrl();

  return {
    subject: `${LEGAL_BRAND_NAME} Hesabınız Silindi`,
    text: [
      `Sayın ${name},`,
      "",
      "Talebiniz doğrultusunda Specia üzerindeki kullanıcı hesabınız ve hesabınıza bağlı tüm kişisel verileriniz KVKK standartlarına uygun olarak kalıcı olarak silinmiştir.",
      "",
      `Sorularınız için ${getLegalContactEmail()} adresine yazabilirsiniz.`,
      "",
      `Saygılarımızla,`,
      `${LEGAL_BRAND_NAME} Ekibi`,
    ].join("\n"),
    html: buildEmailFrame(
      "Hesabınız Kalıcı Olarak Silindi",
      `Sayın <strong>${safeName}</strong>,`,
      `
        <p>Talebiniz doğrultusunda Specia üzerindeki kullanıcı hesabınız ve hesabınıza bağlı tüm kişisel verileriniz, Kişisel Verilerin Korunması Kanunu (KVKK) standartlarına uygun olarak sistemimizden kalıcı olarak temizlenmiştir.</p>
        <p>Hesabınızın silinmesiyle birlikte sistem üzerindeki tüm erişim yetkileriniz iptal edilmiş olup, verilerinize erişim tamamen kapatılmıştır.</p>
      `,
      "Specia Anasayfa",
      homeUrl,
    ),
  };
}

