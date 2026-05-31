import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/utils";

const PER_PAGE = 30;

// 审计动作的中文标签
const actionLabels: Record<string, string> = {
  "user.role_change": "角色变更",
  "competition.create": "创建赛事",
  "competition.delete": "删除赛事",
  "competition.publish": "发布赛事",
  "competition.unpublish": "取消发布",
  "criterion.create": "新增评分维度",
  "criterion.delete": "删除评分维度",
  "field.create": "新增表单字段",
  "field.delete": "删除表单字段",
  "bonus_rule.create": "新增加分项",
  "bonus_rule.delete": "删除加分项",
  "review.reset": "撤销评委评审",
  "assignment.auto": "均衡分配评委",
  "assignment.add": "分配评委",
  "assignment.remove": "取消分配",
  "results.publish": "公布结果",
  "results.unpublish": "撤回公布",
  "submission.promote": "晋级作品",
};

function formatDetail(detail: unknown): string {
  if (!detail || typeof detail !== "object") return "";
  return Object.entries(detail as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole("ADMIN");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const total = await prisma.auditLog.count();
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    include: { actor: { select: { name: true, email: true } } },
  });
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div>
      <PageHeader
        title="审计日志"
        description="敏感管理操作全程留痕——谁、何时、对什么、做了什么，可追溯、不可抵赖。"
      />
      {logs.length === 0 ? (
        <EmptyState>
          暂无审计记录。变更角色、增删赛事 / 字段 / 加分项、撤销评委评审等操作都会记录在此。
        </EmptyState>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">时间</th>
                    <th className="px-4 py-3 font-medium">操作者</th>
                    <th className="px-4 py-3 font-medium">动作</th>
                    <th className="px-4 py-3 font-medium">详情</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDateTime(l.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">
                        {l.actor?.name ?? l.actorEmail ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge tone="primary">
                          {actionLabels[l.action] ?? l.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDetail(l.detail)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {l.ip ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination page={page} totalPages={totalPages} total={total} />
        </>
      )}
    </div>
  );
}
