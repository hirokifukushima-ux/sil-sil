'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}

export default function BottomNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: '/parent',
      icon: '📰',
      label: '記事',
      active: pathname === '/parent'
    },
    {
      href: '/parent/children',
      icon: '👨‍👩‍👧',
      label: '子供',
      active: pathname === '/parent/children'
    },
    {
      href: '/parent/news',
      icon: '🔍',
      label: 'ニュース',
      active: pathname === '/parent/news'
    },
    {
      href: '/parent/settings',
      icon: '⚙️',
      label: '設定',
      active: pathname === '/parent/settings'
    }
  ];

  return (
    <>
      {/* スペーサー：ボトムナビの高さ分の余白 */}
      <div className="h-20 lg:hidden" />

      {/* ボトムナビゲーション：モバイルのみ表示 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors min-w-0 ${
                item.active
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className={`text-xs font-medium truncate ${
                item.active ? 'text-indigo-600' : 'text-gray-600'
              }`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
