import { Card } from '@heroui/react';

type StatCardProps = {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
};

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <Card.Content className="flex flex-row items-center gap-4">
        {icon && <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>}
        <div>
          <p className="text-sm text-default-500">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </Card.Content>
    </Card>
  );
}
