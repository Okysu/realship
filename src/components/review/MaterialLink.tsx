"use client";

import type { MaterialKind } from "@prisma/client";
import { useReviewTracker } from "./ReviewTracker";

// 包装材料链接：评委点击时先记录一条 MaterialView，再打开。
export function MaterialLink({
  href,
  kind,
  refId,
  className,
  children,
}: {
  href: string;
  kind: MaterialKind;
  refId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const tracker = useReviewTracker();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => tracker?.recordView(kind, refId, href)}
    >
      {children}
    </a>
  );
}
