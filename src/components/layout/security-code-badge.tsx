"use client";

import { useEffect, useRef, useState } from "react";
import { Shield } from "lucide-react";
import { generateTotpCode } from "@/lib/totp";

const INTERVAL_SECONDS = 300;
// Kodun paylaşıldıktan sonra bir süre "kullanılamaz" gösterilmesi, önceden
// sunucuya kısa aralıklarla soru sorularak (poll) sağlanıyordu — bu da rozet
// ekranda açık kaldığı sürece kesintisiz veritabanı trafiği üretiyordu. Bu
// tamamen bir kolaylık özelliğiydi: kodun tek kullanımlık olması kuralı
// sunucuda, kodu doğrulayan kişinin tarafında (`isSecondaryCodeValid`) ayrıca
// ve bağımsız olarak uygulanıyor — poll'un kaldırılması o kuralı etkilemez.
// Artık kopyalama anından itibaren tamamen istemci tarafında, görünür bir
// geri sayımla uygulanıyor: veritabanına hiç gidilmiyor, kullanıcı da kodun
// yeniden paylaşılabilir olmasını bekleyen net bir süre görüyor.
const LOCK_SECONDS = 15;

/**
 * Üretim yapabilen hesaplar (öğretmen, kurum yöneticisi, admin) için 5 dakikada
 * bir değişen güvenlik kodu rozeti. `seed` kuruma özgü kod için institutionId,
 * kişiye özgü kod için kullanıcı id'sidir — evrak doğrulama akışı her iki tür
 * tohumu da kabul eder (bkz. `src/lib/document-access-security.ts`).
 * Kod kopyalandığında, yanlışlıkla art arda paylaşımı önlemek için
 * LOCK_SECONDS boyunca görünür bir geri sayımla kilitlenir.
 */
export function SecurityCodeBadge({ seed }: { seed: string }) {
  const [code, setCode] = useState<string>("------");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [lockRemaining, setLockRemaining] = useState<number>(0);
  const lockRemainingRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    async function updateCode() {
      const nowSec = Math.floor(Date.now() / 1000);
      const naturalCounter = Math.floor(nowSec / INTERVAL_SECONDS);
      const remaining = (naturalCounter + 1) * INTERVAL_SECONDS - nowSec;

      if (active) {
        setTimeLeft(remaining);
      }

      try {
        const formatted = await generateTotpCode(seed, INTERVAL_SECONDS, 0);
        if (active) {
          setCode(formatted);
        }
      } catch (err) {
        console.error("Failed to generate TOTP code", err);
      }
    }

    void updateCode();

    const timer = setInterval(() => {
      void updateCode();
      if (lockRemainingRef.current > 0) {
        const next = lockRemainingRef.current - 1;
        lockRemainingRef.current = next;
        if (active) {
          setLockRemaining(next);
        }
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [seed]);

  const isLocked = lockRemaining > 0;

  const handleCopy = () => {
    if (code === "------" || isLocked) return;
    void navigator.clipboard.writeText(code);
    lockRemainingRef.current = LOCK_SECONDS;
    setLockRemaining(LOCK_SECONDS);
  };

  return (
    <div
      onClick={handleCopy}
      title={isLocked ? "Kod yeniden paylaşılabilir olana kadar bekleyin" : "Tıklayarak kopyalayın"}
      className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs transition-colors select-none ${
        isLocked
          ? "cursor-not-allowed border-emerald-500/10 bg-emerald-500/[0.02] text-emerald-400/50"
          : "cursor-pointer border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 active:bg-emerald-500/20"
      }`}
    >
      <Shield className={`size-4 shrink-0 ${isLocked ? "text-emerald-500/40" : "text-emerald-500"}`} />
      <span className="font-medium">
        {isLocked ? (
          <span className="font-mono">Kopyalandı — {lockRemaining}s sonra tekrar paylaşılabilir</span>
        ) : (
          <>
            Güvenlik Kodu: <strong className="font-mono text-sm font-bold text-emerald-300">{code}</strong>
          </>
        )}
      </span>
      {!isLocked && (
        <span className="text-[10px] font-mono text-emerald-500/70">
          ({timeLeft}s)
        </span>
      )}
    </div>
  );
}
