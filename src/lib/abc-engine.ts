export type AbcTag = {
  tag: string;
  displayName: string;
};

// Standard Antecedents Catalog (A)
export const ANTECEDENTS: AbcTag[] = [
  { tag: "Zor_Gorev_Verilmesi", displayName: "Öğrenciye seviyesinin üzerinde veya yeni bir akademik görev verildi" },
  { tag: "Yonerge_Verilmesi", displayName: "Yapması istenen bir eyleme dair yönerge verildi" },
  { tag: "Akran_Etkilesimi", displayName: "Akranlarından biri doğrudan veya dolaylı olarak etkileşime girdi" },
  { tag: "Ortam_Degisikligi", displayName: "Sınıf içi fiziksel düzen veya ders ortamı değiştirildi" },
  { tag: "Gurultulu_Ortam", displayName: "Sınıfta anlık yüksek gürültü veya dikkat dağıtıcı unsur oluştu" },
  { tag: "Ilgi_Kaybi", displayName: "Öğretmen odağını başka bir öğrenciye veya işe yöneltti" },
  { tag: "Serbest_Zaman", displayName: "Öğrenci yapılandırılmamış serbest zaman dilimindeydi" },
  { tag: "Isteginin_Reddedilmesi", displayName: "Öğrencinin talep ettiği nesne, etkinlik veya ilgi isteği reddedildi" }
];

// Standard Consequences Catalog (C)
export const CONSEQUENCES: AbcTag[] = [
  { tag: "Gorevden_Muaf_Tutulma", displayName: "Davranış sonrası ortam sakinleşsin diye görev kısa süreliğine ertelendi veya muaf tutuldu" },
  { tag: "Ilgi_Gosterilmesi", displayName: "Öğretmen veya akranları tarafından sakinleştirilme/ilgi gösterme davranışı yapıldı" },
  { tag: "Duyusal_Rahatlama", displayName: "Öğrenci ortamdan uzaklaştırılarak fiziksel duyusal rahatlaması sağlandı" },
  { tag: "Somut_Nesne_Verilmesi", displayName: "Sakinleşmesi adına istediği nesne, oyuncak veya etkinlik kendisine sağlandı" },
  { tag: "Mola_Odasi", displayName: "Öğrenci güvenli mola alanına yönlendirildi" },
  { tag: "Sozlu_Uyari", displayName: "Yapmaması gerektiği konusunda sözlü uyarı veya komut verildi" },
  { tag: "Gormezden_Gelinme", displayName: "Problemli davranış planlı bir şekilde görmezden gelindi" }
];

// Deduce behavioral function based on Antecedent and Consequence tags
export function inferBehaviorFunction(antecedentTag: string, consequenceTag: string): { primary: string; confidence: number } {
  // Direct rules
  if (consequenceTag === "Gorevden_Muaf_Tutulma") {
    return { primary: "GÖREVDEN KAÇMA (Escape)", confidence: 0.9 };
  }
  if (consequenceTag === "Somut_Nesne_Verilmesi") {
    return { primary: "SOMUT NESNE / ETKİNLİK ELDE ETME (Tangible)", confidence: 0.95 };
  }
  if (consequenceTag === "Ilgi_Gosterilmesi" || consequenceTag === "Sozlu_Uyari") {
    return { primary: "İLGİ / DİKKAT ÇEKME (Attention)", confidence: 0.85 };
  }
  if (consequenceTag === "Duyusal_Rahatlama" || consequenceTag === "Mola_Odasi") {
    return { primary: "DUYUSAL RAHATLAMA (Sensory)", confidence: 0.8 };
  }

  // Cross reference defaults
  if (antecedentTag === "Zor_Gorev_Verilmesi" || antecedentTag === "Yonerge_Verilmesi") {
    return { primary: "GÖREVDEN KAÇMA (Escape)", confidence: 0.75 };
  }
  if (antecedentTag === "Ilgi_Kaybi" || antecedentTag === "Akran_Etkilesimi") {
    return { primary: "İLGİ / DİKKAT ÇEKME (Attention)", confidence: 0.7 };
  }
  if (antecedentTag === "Gurultulu_Ortam") {
    return { primary: "DUYUSAL RAHATLAMA (Sensory)", confidence: 0.75 };
  }
  if (antecedentTag === "Isteginin_Reddedilmesi") {
    return { primary: "SOMUT NESNE / ETKİNLİK ELDE ETME (Tangible)", confidence: 0.8 };
  }

  return { primary: "BİRDEN FAZLA İŞLEV / BELİRSİZ", confidence: 0.5 };
}

// Get intervention recommendations based on primary function
export function getInterventionRecommendation(behaviorFunction: string): string {
  if (behaviorFunction.includes("Escape")) {
    return "müdahale planında görsel çizelgelerle geçiş süreçlerinin desteklenmesi, zor görevlerin küçük parçalara bölünmesi ve mola talebinin alternatif/işlevsel bir dille öğretilmesi önerilmektedir";
  }
  if (behaviorFunction.includes("Attention")) {
    return "müdahale planında olumlu davranışların pekiştirilmesi (Örn: Sözel takdir), problemli davranış dışı anlarda planlı ilgi gösterilmesi ve çığlık dışı ilgi isteme yöntemlerinin modellenmesi önerilmektedir";
  }
  if (behaviorFunction.includes("Sensory")) {
    return "müdahale planında ders aralarında duyusal mola verilmesi, sınıf içi gürültüyü azaltıcı kulaklık kullanılması veya sakinleşme köşesi egzersizlerinin rutine eklenmesi önerilmektedir";
  }
  if (behaviorFunction.includes("Tangible")) {
    return "müdahale planında nesneye ulaşmak için geçiş kartları veya sembol pekiştirme tablolarının kullanılması, bekleme süresinin görsel olarak belirtilmesi ve sakin kalma anlarında pekiştireç sunulması önerilmektedir";
  }
  return "müdahale planında önleyici çevresel düzenlemelerin yapılması ve alternatif olumlu davranışların sistematik olarak öğretilmesi önerilmektedir";
}

type LogInputForAnalysis = {
  durationSeconds: number;
  frequency: number;
  antecedentTag: string | null;
  consequenceTag: string | null;
};

// Generates the final official report structure
export function analyzeAbcLogs(
  behaviorName: string,
  logs: LogInputForAnalysis[]
): {
  totalCount: number;
  labeledCount: number;
  avgDuration: number;
  primaryFunction: string;
  confidenceScore: number;
  reportText: string;
} {
  const totalCount = logs.length;
  const labeledLogs = logs.filter(l => l.antecedentTag && l.consequenceTag);
  const labeledCount = labeledLogs.length;

  if (totalCount === 0) {
    return {
      totalCount: 0,
      labeledCount: 0,
      avgDuration: 0,
      primaryFunction: "Veri Yetersiz",
      confidenceScore: 0,
      reportText: "Rapor üretmek için en az 1 adet davranış gözlem kaydı bulunmalıdır."
    };
  }

  // Calculate avg duration
  const totalDuration = logs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
  const avgDuration = Math.round(totalDuration / totalCount);

  // Default fallback if no labeled data yet
  if (labeledCount === 0) {
    return {
      totalCount,
      labeledCount: 0,
      avgDuration,
      primaryFunction: "Yorumlama Bekleniyor",
      confidenceScore: 0,
      reportText: `Sistematik gözlem verilerine göre öğrencinin sergilemiş olduğu '${behaviorName}' davranışı toplam ${totalCount} kez kaydedilmiştir. Davranış ortalama ${avgDuration} saniye sürmüştür. Akıllı analiz ve RAM raporu oluşturulabilmesi için gün sonu panelinden gözlem kayıtlarının öncesi (Antecedent) ve sonrası (Consequence) durumlarının yorumlanması gerekmektedir.`
    };
  }

  // Count Antecedents
  const antecedentCounts: Record<string, number> = {};
  labeledLogs.forEach(l => {
    if (l.antecedentTag) {
      antecedentCounts[l.antecedentTag] = (antecedentCounts[l.antecedentTag] || 0) + 1;
    }
  });

  // Count Consequences
  const consequenceCounts: Record<string, number> = {};
  labeledLogs.forEach(l => {
    if (l.consequenceTag) {
      consequenceCounts[l.consequenceTag] = (consequenceCounts[l.consequenceTag] || 0) + 1;
    }
  });

  // Find most frequent Antecedent
  let topAntecedentTag = "";
  let topAntecedentCount = 0;
  Object.entries(antecedentCounts).forEach(([tag, count]) => {
    if (count > topAntecedentCount) {
      topAntecedentCount = count;
      topAntecedentTag = tag;
    }
  });

  // Find most frequent Consequence
  let topConsequenceTag = "";
  let topConsequenceCount = 0;
  Object.entries(consequenceCounts).forEach(([tag, count]) => {
    if (count > topConsequenceCount) {
      topConsequenceCount = count;
      topConsequenceTag = tag;
    }
  });

  const antecedentPercent = Math.round((topAntecedentCount / labeledCount) * 100);
  const consequencePercent = Math.round((topConsequenceCount / labeledCount) * 100);

  const topAntecedentObj = ANTECEDENTS.find(a => a.tag === topAntecedentTag);
  const topConsequenceObj = CONSEQUENCES.find(c => c.tag === topConsequenceTag);

  const antecedentDisplay = topAntecedentObj ? topAntecedentObj.displayName.toLowerCase() : "belirli bir tetikleyici gözlenmeden";
  const consequenceDisplay = topConsequenceObj ? topConsequenceObj.displayName.toLowerCase() : "ortama müdahale edilmeden";

  // Deduce function
  const functionResult = inferBehaviorFunction(topAntecedentTag, topConsequenceTag);
  const recommendation = getInterventionRecommendation(functionResult.primary);

  // Generate official text format
  const reportText = `Yapılan ${totalCount} ders saatlik UDA (Uygulamalı Davranış Analizi) sistematik gözlem verilerine göre; öğrencinin sergilemiş olduğu '${behaviorName}' davranışı %${antecedentPercent} oranında ${antecedentDisplay} Öncesi / Antecedent tetiklenmektedir. Davranış gerçekleştikten sonra sürecin %${consequencePercent}'inde ${consequenceDisplay} Sonrası / Consequence durumunun yaşandığı saptanmıştır. Bu veriler ışığında davranışın birincil işlevinin '${functionResult.primary}' olduğu analitik olarak belirlenmiştir. Dönem boyunca davranış ortalama ${avgDuration} saniye sürmüş olup, ${recommendation}.`;

  return {
    totalCount,
    labeledCount,
    avgDuration,
    primaryFunction: functionResult.primary,
    confidenceScore: parseFloat(((antecedentPercent + consequencePercent) / 200 * functionResult.confidence).toFixed(2)),
    reportText
  };
}
