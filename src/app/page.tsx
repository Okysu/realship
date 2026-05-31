import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AppNav } from "@/components/app-nav";
import { FadeIn } from "@/components/ui/motion";
import { getCurrentUser } from "@/lib/rbac";

const principles = [
  {
    no: "01",
    title: "评审全程留痕",
    desc: "谁看了、看了多久、打开了哪些材料，全部可追溯。你的作品不会再「零流量」——被认真看过，有据可查。",
  },
  {
    no: "02",
    title: "AI 提问驱动审阅",
    desc: "AI 读完你的材料后向评委提问，评委必须看过你的视频与产品才答得上来。不看，就答不出。",
  },
  {
    no: "03",
    title: "重产品，反 PPT",
    desc: "上架应用市场、邀测链接、可运行仓库是加分硬通货；纯概念与 H5 套壳，会被识破并扣分。",
  },
  {
    no: "04",
    title: "平等评审池",
    desc: "所有作品进入同一个评审池，没有「直邀」，没有被推荐的特权通道。名额，留给真东西。",
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <AppNav
        links={[
          { href: "/competitions", label: "赛事规则" },
          { href: "/showcase", label: "作品展示墙" },
          { href: "/ranking", label: "排名榜" },
        ]}
      >
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background transition-opacity hover:opacity-90"
          >
            我的面板
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            登录
          </Link>
        )}
      </AppNav>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-6rem] h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <FadeIn className="relative mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="font-mono text-sm tracking-widest text-primary">
              REAL · 公开评选
            </p>
          </div>
          <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            让每一个真正能跑起来的产品，
            <br className="hidden sm:block" />
            <span className="text-primary">被认真看见。</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Real 是一个长期主义的公开评选——只认跑得起来的东西：上架、邀测、可运行的仓库，而不是
            PPT 与概念。每一次评审都全程留痕，你能看到谁、在什么时候、看了多久你的作品。
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/competitions"
              className="flex h-12 items-center justify-center rounded-2xl bg-primary px-7 font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
            >
              查看赛事规则与评分权重
            </Link>
            <Link
              href="/showcase"
              className="flex h-12 items-center justify-center rounded-2xl border border-border px-7 font-medium text-foreground transition-all hover:border-primary hover:text-primary active:scale-[0.98]"
            >
              浏览作品展示墙
            </Link>
          </div>

          <section className="mt-24 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {principles.map((p) => (
              <Card
                key={p.no}
                className="p-8 transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_20px_48px_-20px_rgba(15,23,42,0.18)]"
              >
                <span className="font-mono text-sm text-primary">{p.no}</span>
                <h2 className="mt-3 text-xl font-semibold text-foreground">
                  {p.title}
                </h2>
                <p className="mt-3 leading-7 text-muted-foreground">{p.desc}</p>
              </Card>
            ))}
          </section>
        </FadeIn>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          <p>
            Real · 一个独立的开发者公开评选 · 与任何官方赛事无关。
          </p>
          <p className="mt-1">
            评分维度与权重全程公开 · 赞助与评审彻底隔离 · 重产品，轻 PPT。
          </p>
        </div>
      </footer>
    </div>
  );
}
