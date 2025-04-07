import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BookAudio, Headphones, TextSearch, Volume } from "lucide-react";
import Link from "next/link";
import "./animations.css";

const LandingPage = () => {
  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <header className="fixed top-0 w-full border-b backdrop-blur-md z-50">
        <Container className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <BookAudio className="h-6 w-6" />
            <span className="text-xl font-bold">AudioGen</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button>
                Login
              </Button>
            </Link>
          </div>
        </Container>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 md:min-h-[80vh] flex items-center overflow-hidden">
        {/* Background audio waveform effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10"></div>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-sm bg-primary/20"
              style={{
                width: "2px",
                height: `${Math.random() * 100 + 20}px`,
                bottom: "0",
                left: `${i * 2}%`,
                opacity: Math.random() * 0.5 + 0.2,
                animation: `wave ${Math.random() * 2 + 1}s infinite alternate`,
              }}
            ></div>
          ))}
        </div>

        <Container className="max-w-4xl">
          <div className="text-center fade-in fade-in-delay-200">
            <Badge className="mb-6" variant="secondary">
              AI-Powered
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
              Transform text into natural sounding audiobooks
            </h1>
            <p className="text-xl mb-12 max-w-2xl mx-auto text-muted-foreground">
              Our advanced AI technology converts your written content into
              high-quality, human-like audio narration in minutes. Perfect for
              authors, educators, and content creators.
            </p>
            <div className="flex justify-center">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8">Start Generating</Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Feature highlights section */}
      <section className="py-20 px-4">
        <Container className="max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for Perfect Audiobooks
            </h2>
            <p className="text-lg max-w-2xl mx-auto">
              Everything you need to create professional audiobooks effortlessly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Volume className="h-6 w-6" />,
                title: "Natural Voices",
                description:
                  "Choose from multiple AI voices that sound remarkably human with proper intonation and emotion.",
              },
              {
                icon: <TextSearch className="h-6 w-6" />,
                title: "Text Analysis",
                description:
                  "Our AI understands context to provide appropriate pauses and emphasis for better listening.",
              },
              {
                icon: <Headphones className="h-6 w-6" />,
                title: "High Quality Output",
                description:
                  "Generate studio-quality audio files ready for distribution on any platform.",
              },
            ].map((feature, index) => (
              <Card key={index} className="border">
                <CardContent className="pt-6">
                  <div className="rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <Container className="max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg max-w-2xl mx-auto">
              Create your audiobook in just three simple steps
            </p>
          </div>

          <div className="flex flex-col gap-12">
            {[
              {
                step: "1",
                title: "Upload Your Content",
                description:
                  "Paste your text or upload document files (PDF, DOCX, EPUB). Our system will process the content structure.",
              },
              {
                step: "2",
                title: "Customize Settings",
                description:
                  "Select your preferred voice, narration speed, and output format. Preview samples before generating.",
              },
              {
                step: "3",
                title: "Generate & Download",
                description:
                  "Get your high-quality MP3 files ready for distribution. Save chapters individually or as a complete book.",
              },
            ].map((item, index) => (
              <Card key={index} className="flex flex-col md:flex-row gap-6 items-start p-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 bg-primary/10">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <Container className="max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to create your audiobook?
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8 text-muted-foreground">
            Join thousands of authors and content creators who are transforming
            their work into audio.
          </p>

          <Button size="lg">Start Generating Now</Button>
        </Container>
      </section>
    </div>
  );
};

export default LandingPage;
