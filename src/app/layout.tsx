import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Friday Evening', description: 'A Friday evening at a pixel bar. Rock, paper, scissors. One last shot.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
