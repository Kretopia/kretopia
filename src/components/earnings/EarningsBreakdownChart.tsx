import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface EarningsBreakdownChartProps {
  invoiceIncome: number;
  marketplaceIncome: number;
  paymentIncome: number;
  currency: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142 76% 36%)",    // green
  "hsl(262 83% 58%)",    // violet
  "hsl(38 92% 50%)",     // amber
];

export function EarningsBreakdownChart({ invoiceIncome, marketplaceIncome, paymentIncome, currency }: EarningsBreakdownChartProps) {
  const data = useMemo(() => {
    const items = [
      { name: "Invoices", value: invoiceIncome },
      { name: "Marketplace", value: marketplaceIncome },
      { name: "Direct Payments", value: paymentIncome },
    ].filter(d => d.value > 0);
    return items;
  }, [invoiceIncome, marketplaceIncome, paymentIncome]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Earnings Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground">No earnings data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Earnings Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${currency}${value.toFixed(2)}`, ""]}
              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
            />
            <Legend
              formatter={(value) => <span className="text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
