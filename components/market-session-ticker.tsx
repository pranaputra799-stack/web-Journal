"use client";

import { useEffect, useState } from "react";

interface SessionInfo {
  name: string;
  flag: string;
  city: string;
  active: boolean;
  hoursWib: string;
}

export function MarketSessionTicker({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [timeInfo, setTimeInfo] = useState<{
    wibTime: string;
    utcTime: string;
    sessions: SessionInfo[];
    isOverlap: boolean;
    activeCount: number;
  }>({
    wibTime: "",
    utcTime: "",
    sessions: [],
    isOverlap: false,
    activeCount: 0,
  });

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const now = new Date();

      // WIB (UTC+7) hour and minute
      const wibHour = (now.getUTCHours() + 7) % 24;
      const wibMinutes = now.getUTCMinutes();
      const wibFormatted = `${String(wibHour).padStart(2, "0")}:${String(wibMinutes).padStart(2, "0")}`;
      const utcFormatted = `${String(now.getUTCHours()).padStart(2, "0")}:${String(wibMinutes).padStart(2, "0")} UTC`;

      // Session windows in WIB (24-hour format)
      // Tokyo: 06:00 - 15:00 WIB
      const isTokyo = wibHour >= 6 && wibHour < 15;
      // London: 14:00 - 23:00 WIB
      const isLondon = wibHour >= 14 && wibHour < 23;
      // New York: 19:00 - 04:00 WIB (crosses midnight)
      const isNewYork = wibHour >= 19 || wibHour < 4;

      const isOverlap = isLondon && isNewYork;

      const sessions: SessionInfo[] = [
        {
          name: "Tokyo",
          city: "Asia",
          flag: "🇯🇵",
          active: isTokyo,
          hoursWib: "06:00 - 15:00",
        },
        {
          name: "London",
          city: "Eropa",
          flag: "🇬🇧",
          active: isLondon,
          hoursWib: "14:00 - 23:00",
        },
        {
          name: "New York",
          city: "US",
          flag: "🇺🇸",
          active: isNewYork,
          hoursWib: "19:00 - 04:00",
        },
      ];

      const activeCount = sessions.filter((s) => s.active).length;

      setTimeInfo({
        wibTime: wibFormatted,
        utcTime: utcFormatted,
        sessions,
        isOverlap,
        activeCount,
      });
    };

    update();
    const interval = setInterval(update, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted ${className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-line" />
        <span className="num font-mono">Memuat sesi pasar...</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 select-none ${className}`}
      title={`WIB: ${timeInfo.wibTime} WIB · ${timeInfo.utcTime}`}
    >
      {/* Real-time Clock Badge */}
      <div className="flex items-center gap-1.5 rounded border border-line/60 bg-raised/40 px-2 py-1 text-xs">
        <span className="num font-mono font-medium text-paper">{timeInfo.wibTime}</span>
        <span className="num text-[10px] text-muted">WIB</span>
      </div>

      {/* Overlap Special Pill if active */}
      {timeInfo.isOverlap ? (
        <div className="flex items-center gap-1.5 rounded border border-brass/50 bg-brass/10 px-2 py-1 text-xs text-brass shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brass animate-ping" />
          <span className="num text-[11px] font-semibold tracking-wide">
            🔥 London & NY Overlap (Likuiditas Tinggi)
          </span>
        </div>
      ) : null}

      {/* Individual Sessions */}
      <div className="flex items-center gap-1">
        {timeInfo.sessions.map((session) => (
          <div
            key={session.name}
            className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition-colors ${
              session.active
                ? "border-profit/40 bg-profit/10 text-paper font-medium shadow-sm"
                : "border-line/40 bg-transparent text-muted/70"
            }`}
            title={`${session.name} (${session.city}): ${session.hoursWib} WIB ${
              session.active ? "· Sedang Aktif" : "· Tutup"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                session.active ? "bg-profit animate-pulse" : "bg-line"
              }`}
            />
            <span className="text-[10px]">{session.flag}</span>
            <span className="num">{session.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
