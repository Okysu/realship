import { BackLink } from "@/components/ui/back-link";
import { CompetitionForm } from "@/components/forms/CompetitionForm";
import { Card } from "@/components/ui/card";

export default function NewCompetitionPage() {
  return (
    <div className="max-w-3xl">
      <BackLink href="/admin">返回赛事列表</BackLink>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-foreground">新建赛事</h1>
      <Card className="p-6">
        <CompetitionForm />
      </Card>
    </div>
  );
}
