import AuthForm from "@/components/AuthForm";
import AuthVisual from "@/components/AuthVisual";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0D0D0F] px-4 py-8 text-white">
      <section className="grid min-h-[580px] w-full max-w-[900px] overflow-hidden rounded-[24px] border border-white/[0.06] opacity-0 [animation:authCardEnter_0.4s_ease_forwards] md:grid-cols-[45%_55%]">
        <AuthForm />
        <AuthVisual />
      </section>
    </main>
  );
}
