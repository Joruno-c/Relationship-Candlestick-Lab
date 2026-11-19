import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "关系 K 线 · 在线实验室",
  description: "上传聊天记录，探索互动变化与群聊协作。支持匿名演示、AI 分析、多周期 K 线与报告导出。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
