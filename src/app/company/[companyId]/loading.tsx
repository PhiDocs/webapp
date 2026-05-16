import { Skeleton } from '@/components/ui/skeleton';

export default function CompanyLoading() {
  return (
    <div className="min-h-screen bg-[#f7f2ee] p-6 lg:pl-80">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
