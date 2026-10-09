import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Shot Roulette — Last call', description: 'Пиксельный бар. Камень, ножницы, бумага. Один последний шот.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ru"><body>{children}</body></html>; }
