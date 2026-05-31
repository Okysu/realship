import { Search } from "lucide-react";
import type { UserRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { setUserRole } from "@/server/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { TabButton } from "@/components/ui/tab-button";
import { roleLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

const PER_PAGE = 20;

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "PARTICIPANT", label: "参赛者" },
  { value: "JUDGE", label: "评委" },
  { value: "ADMIN", label: "管理员" },
];

const roleTone: Record<UserRole, "default" | "primary" | "warning"> = {
  PARTICIPANT: "default",
  JUDGE: "primary",
  ADMIN: "warning",
};

const TABS = [
  { value: "", label: "全部" },
  { value: "PARTICIPANT", label: "参赛者" },
  { value: "JUDGE", label: "评委" },
  { value: "ADMIN", label: "管理员" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const { q, role, page: pageParam } = await searchParams;
  const me = await requireRole("ADMIN");
  const page = Math.max(1, Number(pageParam) || 1);
  const validRole =
    role && ["PARTICIPANT", "JUDGE", "ADMIN"].includes(role)
      ? (role as UserRole)
      : undefined;

  const where: Prisma.UserWhereInput = {
    ...(validRole ? { role: validRole } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await prisma.user.count({ where });
  const users = await prisma.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  const totalPages = Math.ceil(total / PER_PAGE);
  const grouped = await prisma.user.groupBy({ by: ["role"], _count: true });
  const countByRole = Object.fromEntries(
    grouped.map((g) => [g.role, g._count]),
  ) as Record<UserRole, number>;

  const tabHref = (r: string) => {
    const sp = new URLSearchParams();
    if (r) sp.set("role", r);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `?${s}` : "/admin/users";
  };

  return (
    <div>
      <PageHeader
        title="用户与评委"
        description="评委席位由主办方在此审核分配——评审权受控、不自由领取，这正是我们反「直邀」的方式。"
      />

      {/* 角色统计 */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {ROLE_OPTIONS.map((r) => (
          <Card key={r.value} className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {countByRole[r.value] ?? 0}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {r.label}
            </div>
          </Card>
        ))}
      </div>

      {/* 角色筛选 Tab + 搜索 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <TabButton
              key={t.value}
              active={(validRole ?? "") === t.value}
              href={tabHref(t.value)}
            >
              {t.label}
            </TabButton>
          ))}
        </div>
        <form action="/admin/users" className="flex gap-2">
          {validRole && <input type="hidden" name="role" value={validRole} />}
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="搜索姓名 / 邮箱"
              className="w-56 pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            搜索
          </Button>
        </form>
      </div>

      {/* 用户表格 */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">邮箱</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">注册时间</th>
                <th className="px-4 py-3 text-right font-medium">变更角色</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                    {u.name ?? "—"}
                    {u.id === me.id && <Badge className="ml-2">你</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={roleTone[u.role]}>{roleLabels[u.role]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDateTime(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {u.id === me.id ? (
                      <span className="block text-right text-xs text-muted-foreground">
                        不可修改自己
                      </span>
                    ) : (
                      <form
                        action={setUserRole}
                        className="flex items-center justify-end gap-2"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <Select
                          name="role"
                          defaultValue={u.role}
                          className="w-28"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </Select>
                        <Button variant="secondary" className="shrink-0 px-3">
                          更新
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    没有匹配的用户。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        params={{ q, role: validRole }}
      />
    </div>
  );
}
