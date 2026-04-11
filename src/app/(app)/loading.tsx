import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col h-full w-full items-center justify-center space-y-4 animate-in fade-in duration-500 min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      <div className="flex flex-col items-center">
        <h3 className="text-xl font-bold text-gray-800">Hang tight...</h3>
        <p className="text-sm text-gray-500 mt-1 animate-pulse">Running live calculations for GroChurch.</p>
      </div>
      
      {/* Skeleton Mock to prevent layout jumping */}
      <div className="w-full max-w-4xl opacity-50 pointer-events-none mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div className="h-32 bg-gray-100 rounded-xl"></div>
            <div className="h-32 bg-gray-100 rounded-xl"></div>
            <div className="h-32 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
