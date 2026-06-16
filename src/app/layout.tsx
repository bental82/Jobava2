import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'מדריך הרפרטואר — ז׳ובבה לונדון',
  description:
    'חקירת רפרטואר ז׳ובבה־לונדון של הלבן עם הסבר ההיגיון מאחורי כל מהלך.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Hebrew, right-to-left.
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
