import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "P2P Lending | Cardano",
  description: "Nền tảng cho vay ngang hàng phi tập trung trên Cardano Preview Testnet",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
