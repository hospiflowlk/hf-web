import { Sidebar } from "@/components/Sidebar";
import { ReactNode } from "react";
import { MobileHeader } from "@/components/MobileHeader";
import { SWRProvider } from "@/components/SWRProvider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SWRProvider>
      <div className="flex h-screen overflow-hidden bg-secondary/30">
        {/* Sidebar for desktop */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
            <MobileHeader />
            
            <div className="p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SWRProvider>
  );
}
