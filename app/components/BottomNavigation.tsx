import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Search, Map, Heart, User } from 'lucide-react';

const BottomNavigation = ({ user }) => {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
  console.log('BottomNavigation rendered:', { pathname, user, isMobile });
}, [pathname, user, isMobile]);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);


  if (!isMobile) return null;

  const navItems = [
  { icon: Home, label: 'ホーム', path: '/', isActive: pathname === '/' },
  { icon: Search, label: '探索', path: '/explore', isActive: pathname === '/explore' },
  { icon: Map, label: 'マイマップ', path: '/mymap', isActive: pathname.startsWith('/mymap') },
  { icon: Heart, label: 'フォロー', path: '/follow', isActive: pathname === '/follow' },
  { icon: User, label: 'メニュー', path: user ? '/admin' : '/auth', isActive: pathname === '/auth' || pathname.startsWith('/admin') || pathname.startsWith('/profile') }
];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="grid grid-cols-5 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.path} href={item.path} className={`flex flex-col items-center justify-center py-2 transition-colors ${item.isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              <Icon size={24} className={item.isActive ? 'fill-current' : ''} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;