"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MaterialKind } from "@prisma/client";
import {
  startReviewSession,
  heartbeat,
  recordMaterialView,
  endReviewSession,
} from "@/server/actions/review";

const HEARTBEAT_SEC = 15;

type TrackerCtx = {
  recordView: (kind: MaterialKind, refId?: string, url?: string) => void;
};

const Ctx = createContext<TrackerCtx | null>(null);

export function useReviewTracker() {
  return useContext(Ctx);
}

// 评委审阅详情页的留痕埋点：开会话 → 定时心跳（仅页面可见时）→ 离开结算。
export function ReviewTracker({
  submissionId,
  children,
}: {
  submissionId: string;
  children: React.ReactNode;
}) {
  const sessionRef = useRef<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let mounted = true;
    startReviewSession(submissionId).then((id) => {
      if (mounted && id) {
        sessionRef.current = id;
        setActive(true);
      }
    });

    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && sessionRef.current) {
        void heartbeat(sessionRef.current, HEARTBEAT_SEC);
      }
    }, HEARTBEAT_SEC * 1000);

    const onHide = () => {
      if (sessionRef.current) void endReviewSession(sessionRef.current, 5);
    };
    window.addEventListener("pagehide", onHide);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      if (sessionRef.current) void endReviewSession(sessionRef.current, 5);
    };
  }, [submissionId]);

  const recordView: TrackerCtx["recordView"] = (kind, refId, url) => {
    if (sessionRef.current) {
      void recordMaterialView({ sessionId: sessionRef.current, kind, refId, url });
    }
  };

  return (
    <Ctx.Provider value={{ recordView }}>
      {children}
      {active && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
          </span>
          本次审阅全程留痕（参赛者可见）
        </div>
      )}
    </Ctx.Provider>
  );
}
