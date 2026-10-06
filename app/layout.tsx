import type { Metadata, Viewport } from "next";
import { Darumadrop_One, Jua } from "next/font/google";
import "./globals.css";
import "./dashboard.css";
import "./event.css";

// Haven's type: Darumadrop One for display, Jua for everything else.
const display = Darumadrop_One({ variable: "--font-darumadrop", weight: "400", subsets: ["latin", "latin-ext"] });
const body = Jua({ variable: "--font-jua", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "50 Days Till Daven", template: "%s · 50 Days Till Daven" },
  description: "Signup streaks for every Hack Club Haven event.",
};

export const viewport: Viewport = {
  themeColor: "#ed5615",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
