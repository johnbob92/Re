import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireFlow — Modern Recruiter System",
  description:
    "Multi-tenant recruiter platform for Super Admins, Admins, Recruiters, and Candidates with Calendly, Google Calendar, Gmail, Slack, and S3 integrations.",
};

/** Runs before paint so theme matches localStorage without React hydration flicker. */
const themeBootScript = `
(function(){
  try {
    var mode = localStorage.getItem('hireflow-mode') || 'auto';
    var color = localStorage.getItem('hireflow-color') || 'ocean';
    var hour = new Date().getHours();
    var resolved = mode === 'auto' ? ((hour >= 19 || hour < 7) ? 'dark' : 'light') : mode;
    var root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.color = color;
    root.classList.toggle('dark', resolved === 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-color="ocean"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
