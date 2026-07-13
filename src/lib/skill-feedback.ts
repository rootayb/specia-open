/**
 * Beceri analizi sonuçlarından öğretmen/veliye sunulacak hazır ama
 * bireyselleştirilmiş dönüt metni üretir. Şablonlar beceri adı, bağımsızlık
 * yüzdesi, oturumlar arası gelişim eğilimi ve öğrencinin gerçek basamak
 * metinleriyle (en güçlü/en çok desteğe ihtiyaç duyduğu basamaklar)
 * doldurularak her öğrenci için farklı bir metin oluşur.
 */
import { computeSkillSummary, getSkillMark, type SkillAnalysisData } from "@/lib/skill-analysis";

type PerformanceTier = "none" | "low" | "developing" | "good" | "high" | "full";

function tierFromPercent(percent: number): PerformanceTier {
  if (percent <= 0) return "none";
  if (percent < 25) return "low";
  if (percent < 50) return "developing";
  if (percent < 75) return "good";
  if (percent < 100) return "high";
  return "full";
}

/** Aynı girdi için her zaman aynı, girdiler arasında farklı varyant seçer (sahte rastgelelik). */
function pickVariant<T>(variants: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return variants[hash % variants.length];
}

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

const TIER_TEMPLATES: Record<PerformanceTier, string[]> = {
  none: [
    "{skill} becerisinde bu oturumda bağımsız olarak gerçekleştirilen basamak bulunmamaktadır; tüm basamaklarda ipucu veya tam destek sağlanmıştır.",
    "{skill} becerisi için henüz bağımsız performans gözlenmemiştir; çalışmaların ipuçlu öğretimle sürdürülmesi önerilir.",
    "{skill} becerisinde bu aşamada destekle ilerleme sağlanmış, bağımsız basamak kaydedilmemiştir.",
  ],
  low: [
    "{skill} becerisinde basamakların %{percent}'ini bağımsız olarak tamamladı; destek ihtiyacının halen yoğun olduğu görülmektedir.",
    "{skill} becerisinde sınırlı düzeyde bağımsızlık (%{percent}) gözlenmiştir; ipuçlu öğretime devam edilmesi önerilir.",
    "{skill} becerisinde %{percent} oranında bağımsız basamak gerçekleştirdi; bu erken aşama için beklenen bir performanstır.",
  ],
  developing: [
    "{skill} becerisinde basamakların %{percent}'ini bağımsız olarak gerçekleştirerek gelişim göstermeye başladı.",
    "{skill} becerisinde %{percent} bağımsızlık oranıyla kademeli bir ilerleme kaydetti.",
    "{skill} becerisinde basamakların önemli bir kısmında halen desteğe ihtiyaç duysa da %{percent} oranında bağımsız performans sergiledi.",
  ],
  good: [
    "{skill} becerisinde basamakların %{percent}'ini bağımsız olarak tamamlayarak iyi düzeyde bir performans gösterdi.",
    "{skill} becerisinde %{percent} bağımsızlık oranına ulaşarak belirgin bir ilerleme kaydetti.",
    "{skill} becerisinde basamakların büyük bölümünü bağımsız gerçekleştirdi (%{percent}); desteğin kademeli azaltılarak izlenmesi önerilir.",
  ],
  high: [
    "{skill} becerisinde basamakların %{percent}'ini bağımsız olarak gerçekleştirerek yüksek bir performans sergiledi.",
    "{skill} becerisinde %{percent} bağımsızlık oranıyla beceriyi kazanmaya çok yaklaştı.",
    "{skill} becerisinde basamakların büyük çoğunluğunu (%{percent}) bağımsız tamamladı; kalıcılığın izlenmesi önerilir.",
  ],
  full: [
    "{skill} becerisini bu oturumda basamakların tamamında (%100) bağımsız olarak gerçekleştirdi.",
    "{skill} becerisinde tam bağımsızlık sağladı; beceri kazanılmış olarak değerlendirilebilir.",
    "{skill} becerisinin tüm basamaklarını bağımsız tamamlayarak hedefe ulaştı; kalıcılığın farklı ortam ve kişilerle de değerlendirilmesi önerilir.",
  ],
};

const TREND_TEMPLATES = {
  up: [
    "İlk oturumdan son oturuma kadar bağımsızlık oranı %{from}'dan %{to}'a yükselmiştir; bu olumlu bir gelişim göstergesidir.",
    "Oturumlar arasında bağımsızlık oranında %{diff} puanlık bir artış gözlenmiştir; çalışmaların aynı yöntemle sürdürülmesi önerilir.",
  ],
  down: [
    "İlk oturuma kıyasla son oturumda bağımsızlık oranında bir düşüş (%{from} → %{to}) gözlenmiştir; motivasyon, ortam veya yorgunluk gibi etkenlerin gözden geçirilmesi önerilir.",
  ],
  stable: [
    "Oturumlar arasında bağımsızlık oranı %{from} civarında kararlılık göstermektedir.",
  ],
} satisfies Record<"up" | "down" | "stable", string[]>;

function joinStepsTr(steps: string[]): string {
  if (steps.length <= 1) return steps[0] ?? "";
  if (steps.length === 2) return `${steps[0]} ve ${steps[1]}`;
  return `${steps.slice(0, -1).join(", ")} ve ${steps[steps.length - 1]}`;
}

function buildStrugglingSentence(steps: string[]): string | null {
  if (steps.length === 0) return null;
  const list = joinStepsTr(steps.map((step) => `"${step}"`));
  const word = steps.length > 1 ? "basamaklarında" : "basamağında";
  return `Özellikle ${list} ${word} ek destek ve tekrarlı çalışma önerilir.`;
}

function buildMasteredSentence(steps: string[]): string | null {
  if (steps.length === 0) return null;
  const list = joinStepsTr(steps.map((step) => `"${step}"`));
  const word = steps.length > 1 ? "basamaklarını" : "basamağını";
  return `${list} ${word} tüm oturumlarda bağımsız olarak gerçekleştirdi; bu ${steps.length > 1 ? "basamaklar" : "basamak"} kalıcı olarak kazanılmış görünmektedir.`;
}

/**
 * `SkillAnalysisData`'dan, beceri adı/yüzde/eğilim ve öğrencinin gerçek
 * basamak metinleriyle doldurulmuş bireyselleştirilmiş bir dönüt paragrafı
 * üretir. Veri yetersizse kullanıcıyı yönlendiren bir uyarı metni döner.
 */
export function generateSkillFeedback(data: SkillAnalysisData): string {
  const skill = data.targetSkill.trim() || "Bu beceri";

  if (data.steps.length === 0 || data.sessions.length === 0) {
    return "Dönüt oluşturmak için en az bir basamak ve bir oturum girilmesi, ardından işaretleme yapılması gerekmektedir.";
  }

  const hasAnyMark = data.steps.some((step) =>
    data.sessions.some((session) => getSkillMark(data, step.id, session.id) !== ""),
  );
  if (!hasAnyMark) {
    return `${skill} becerisi için henüz işaretleme yapılmadığından otomatik dönüt oluşturulamıyor.`;
  }

  const summary = computeSkillSummary(data);
  const lastSummary = summary[summary.length - 1];
  const seed = `${skill}-${data.sessions.length}-${lastSummary.percent}`;

  const tier = tierFromPercent(lastSummary.percent);
  const sentences: string[] = [
    fill(pickVariant(TIER_TEMPLATES[tier], seed), { skill, percent: String(lastSummary.percent) }),
  ];

  if (summary.length > 1) {
    const first = summary[0].percent;
    const last = lastSummary.percent;
    const diff = last - first;
    const trendKey = diff >= 10 ? "up" : diff <= -10 ? "down" : "stable";
    sentences.push(
      fill(pickVariant(TREND_TEMPLATES[trendKey], `${seed}-trend`), {
        from: String(first),
        to: String(last),
        diff: String(Math.abs(diff)),
      }),
    );
  }

  const sessionCount = data.sessions.length;
  const strugglingSteps = data.steps
    .filter((step) => {
      const hCount = data.sessions.filter(
        (session) => getSkillMark(data, step.id, session.id) === "H",
      ).length;
      return hCount > 0 && hCount >= Math.ceil(sessionCount / 2);
    })
    .map((step) => step.text.trim())
    .filter(Boolean)
    .slice(0, 3);
  const strugglingSentence = buildStrugglingSentence(strugglingSteps);
  if (strugglingSentence) sentences.push(strugglingSentence);

  const masteredSteps = data.steps
    .filter((step) =>
      data.sessions.every((session) => getSkillMark(data, step.id, session.id) === "B"),
    )
    .map((step) => step.text.trim())
    .filter(Boolean)
    .slice(0, 3);
  const masteredSentence = buildMasteredSentence(masteredSteps);
  if (masteredSentence) sentences.push(masteredSentence);

  return sentences.join(" ");
}
