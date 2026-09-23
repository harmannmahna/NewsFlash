import "./globals.css";
import { Providers } from "../components/Providers";

export const metadata = { title: "NewsFlash", description: "Live news, topic briefings, and a clearer view of the news cycle" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;
}
