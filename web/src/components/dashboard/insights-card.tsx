import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function InsightsCard({ title, insights }: { title: string; insights: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles size={15} className="text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-primary/5 px-3 py-2.5 text-sm leading-relaxed"
          >
            {insight}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
