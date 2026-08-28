import Link from "next/link";
import CopyLinkButton from "./components/CopyLinkButton";

const LINE_CARD_LIFF_URL = "https://liff.line.me/2005817629-5BePAHi6";

const TOOLS = [
  {
    href: "/pomodoro",
    emoji: "🍅",
    tag: "生產力",
    title: "番茄鐘",
    desc: "專注、短休息、長休息三段計時，時間到會跳出確認彈窗並持續提示音，直到按下確認才停止，內建 10 種提示音可選。",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    href: "/lottery",
    emoji: "🎡",
    tag: "抽籤",
    title: "幸運轉盤",
    desc: "貼上名單、轉動轉盤抽出幸運兒，支援設定是否允許重複抽取，適合抽獎、分組、選人。",
    gradient: "from-emerald-400 to-teal-600",
  },
  {
    href: "/line-card",
    emoji: "💬",
    tag: "LINE 工具",
    title: "LINE 卡片發送器",
    desc: "透過 LIFF 一鍵發送約展成功卡片給好友或群組，自動帶入展示時間與業務名稱。",
    gradient: "from-green-400 to-emerald-600",
    liffUrl: LINE_CARD_LIFF_URL,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
            <span className="text-2xl">🧰</span>
            WT 的小工具箱
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-500">
            {TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="hover:text-slate-900 transition-colors"
              >
                {t.title}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-sky-300 to-indigo-400 opacity-30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-40 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-300 to-teal-400 opacity-30 blur-3xl"
        />

        <section className="relative mx-auto max-w-5xl px-6 pt-20 pb-14 text-center">
          <span className="inline-block rounded-full bg-indigo-100 px-4 py-1 text-xs font-bold text-indigo-600 tracking-wide">
            WT 自製・免安裝・打開就能用
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            WT 的小工具箱
          </h1>
          <p className="mt-4 text-slate-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            日常會用到的小工具，通通集中在這裡：專注計時、抽籤選人、LINE
            預約卡片發送，點一下卡片就能開始使用。
          </p>
        </section>

        <section id="tools" className="relative mx-auto max-w-5xl px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map((tool) => (
              <div
                key={tool.href}
                className="group flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                <Link href={tool.href} className="flex flex-1 flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.gradient} text-2xl shadow-md`}
                    >
                      {tool.emoji}
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                      {tool.tag}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-900">{tool.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {tool.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600">
                    前往使用
                    <span className="transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>

                {tool.liffUrl && (
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <a
                      href={tool.liffUrl}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 truncate"
                    >
                      在 LINE 開啟 →
                    </a>
                    <CopyLinkButton url={tool.liffUrl} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} WT 的小工具箱</span>
          <span>Built with Next.js</span>
        </div>
      </footer>
    </div>
  );
}
