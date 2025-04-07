import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BookAudio } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import "../animations.css";
import { login } from "./action";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full border-b backdrop-blur-md z-50">
        <Container className="flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BookAudio className="h-6 w-6" />
            <span className="text-xl font-bold">AudioGen</span>
          </Link>
        </Container>
      </header>

      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-sm bg-primary/20"
            style={{
              width: "2px",
              height: `${Math.random() * 60 + 10}px`,
              bottom: "0",
              left: `${i * 2}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animation: `wave ${Math.random() * 2 + 1}s infinite alternate`,
            }}
          ></div>
        ))}
      </div>

      {/* Login Card */}
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 backdrop-blur-md relative z-10 fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <BookAudio className="h-12 w-12" />
            </div>
            <CardTitle className="text-3xl">
              Welcome to AudioGen
            </CardTitle>
            <CardDescription className="text-lg">
              Sign in to create and manage your audiobooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login}>
              <div className="space-y-6">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  <Image
                    src="/google.png"
                    alt="Google Logo"
                    className="mr-2 h-5 w-5"
                    width={30}
                    height={30}
                  />
                  Continue with Google
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
