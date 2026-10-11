import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/felpz/AppSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    </div>
  ),
});

function AuthenticatedLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:block">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-3 py-2 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="rounded-md p-2 hover:bg-secondary" aria-label="Abrir menu">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <AppSidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-mono text-sm font-semibold">Traz AI</span>
          </Link>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
