import { AuthProvider } from '@/contexts/AuthContext';
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { BookAudio, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./action";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  return (
    <AuthProvider>
      <div className="min-h-screen">
        {/* Header */}
        <header className="fixed top-0 w-full border-b backdrop-blur-md z-50">
          <Container className="flex h-16 items-center justify-between px-4 md:px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <BookAudio className="h-6 w-6" />
              <span className="text-xl font-bold">AudioGen</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user?.user?.user_metadata?.avatar_url && (
                  <Image
                    src={user.user?.user_metadata?.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                    width={32}
                    height={32}
                  />
                )}
                <span>
                  {user?.user?.user_metadata?.full_name || user?.user?.email}
                </span>
              </div>
              <form action={logout}>
                <Button
                  variant="ghost"
                  size="icon"
                  type="submit"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </Container>
        </header>

        {/* Main Content */}
        <main className="pt-16">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}