import { HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-primary", className)}>
      <HeartPulse className="h-8 w-8" />
      <span className="text-xl font-bold tracking-tight">EMS Simu-Pro</span>
    </div>
  );
}
