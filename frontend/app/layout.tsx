import "./globals.css";

export const metadata = { title: "News Pulse", description: "A living map of the news cycle" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
