import { Spinner } from '@heroui/react';

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-default-500">{message}</p>
    </div>
  );
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" />
      {message && <p className="mt-4 text-default-500">{message}</p>}
    </div>
  );
}
