import type { Metadata, Viewport } from "next";
import { Newsreader, Spline_Sans_Mono } from "next/font/google";

import "./globals.css";

// Two families, clearly distinct: a warm serif for prose and headings, a mono
// for every figure. No Inter, no Space Grotesk, no system stack.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jurnal Trading",
  description:
    "Jurnal trading pribadi: catat trade, tinjau statistik, jaga disiplin.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#12151a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      data-theme="dark"
      className={`${newsreader.variable} ${splineMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        {/* Applies the saved theme before first paint so a light-theme user
            never sees a dark flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
