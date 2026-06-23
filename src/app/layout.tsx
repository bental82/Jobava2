import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'מדריך רפרטוארים — ז׳ובבה (לבן) וקארו־קאן/סלאב (שחור)',
  description:
    'חקירת הרפרטוארים עם הסבר קצר של מה כל צעד מנסה לעשות בפתיחה.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Hebrew, right-to-left.
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
