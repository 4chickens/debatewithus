import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as a fallback for now
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // Use a generic variable name
});

export const metadata: Metadata = {
  title: "debatewithus // THE ARENA",
  description: "Advanced topic-based debate platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`} // Use the generic variable name
      >
        {children}
      </body>
    </html>
  );
}
