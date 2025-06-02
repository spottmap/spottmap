'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader } from '@googlemaps/js-api-loader';

import { 
  Grid, 
  MapIcon,
  Heart, 
  Share2,
  User, 
  LogIn, 
  LogOut, 
  Plus, 
  UserCircle, 
  Search, 
  MapPin, 
  Eye, 
  AlertCircle,
  Coffee
} from 'lucide-react';

export const dynamic = 'force-dynamic';

declare global {
  interface Window {
    google: any;
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Instagram埋め込みコンポーネント
const InstagramEmbed = ({ url, onLoad }: { url: string; onLoad?: () => void }) => {
  const [showEmbed, setShowEmbed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleShowEmbed = async () => {
    if (showEmbed) return;
    
    setIsLoading(true);
    setShowEmbed(true);
    
    if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
      const script = document.createElement('script');
      script.src = '//www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    }
    
    setTimeout(() => {
      setIsLoading(false);
      onLoad?.();
    }, 2000);
  };

  if (!url) return null;

  return (
    <div className="w-full">
      {!showEmbed ? (
        <div 
          className="relative cursor-pointer"
          onClick={handleShowEmbed}
        >
          <img 
            src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop"
            alt="フォールバック画像"
            className="w-full h-64 object-cover rounded-xl"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className="text-white text-center">
              <div className="text-3xl mb-2">📸</div>
              <div className="text-sm font-medium">Instagram投稿を表示</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          {isLoading && (
            <div className="w-full h-64 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center rounded-xl">
              <div className="flex items-center gap-3 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                <span>Instagram投稿を読み込み中...</span>
              </div>
            </div>
          )}
          <blockquote 
            className="instagram-media" 
            data-instgrm-captioned 
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            style={{ 
              background: '#FFF',
              border: '0',
              borderRadius: '12px',
              margin: '1px',
              maxWidth: '100%',
              minWidth: '326px',
              padding: '0',
              width: 'calc(100% - 2px)'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default function HomePage() {
  const [viewMode, setViewMode] = useState('grid');
  const [spots, setSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [map, setMap] = useState(null);
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [follows, setFollows] = useState(new Set());
  const [authors, setAuthors] = useState(new Map<string, any>());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: favData } = await supabase
          .from('user_favorites')
          .select('spot_id')
          .eq('user_id', user.id);
        
        if (favData) {
          setFavorites(new Set(favData.map(fav => fav.spot_id)));
        }

        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (followData) {
          setFollows(new Set(followData.map(follow => follow.following_id)));
        }
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSpots(spots);
    } else {
      const filtered = spots.filter((spot: any) => 
        spot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spot.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spot.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (spot.tags && spot.tags.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSpots(filtered);
    }
  }, [searchTerm, spots]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setFavorites(new Set());
    setFollows(new Set());
  };

  const toggleFavorite = async (spotId: string) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    const isFavorited = favorites.has(spotId);
    
    if (isFavorited) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('spot_id', spotId);
      
      if (!error) {
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(spotId);
          return newFavorites;
        });
      }
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          spot_id: spotId
        });
      
      if (!error) {
        setFavorites(prev => new Set([...prev, spotId]));
      }
    }
  };

  const toggleFollow = async (authorId: string) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    const isFollowing = follows.has(authorId);
    
    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', authorId);
      
      if (!error) {
        setFollows(prev => {
          const newFollows = new Set(prev);
          newFollows.delete(authorId);
          return newFollows;
        });
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: authorId
        });
      
      if (!error) {
        setFollows(prev => new Set([...prev, authorId]));
      }
    }
  };

  useEffect(() => {
    fetchSpots();
    if (viewMode === 'map') {
      initMap();
    }
  }, [viewMode]);

  const fetchSpots = async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error } = await supabase
      .from('spots')
      .select('*');
    
    if (data) {
      setSpots(data);
      setFilteredSpots(data);
      
      const authorIds = data
        .filter(spot => spot.author_id)
        .map(spot => spot.author_id);
      
      if (authorIds.length > 0) {
        const { data: authorsData } = await supabase
          .from('profiles')
          .select('id, username, display_name, instagram_username, type')
          .in('id', authorIds);
        
        if (authorsData) {
          const authorsMap = new Map();
          authorsData.forEach(author => {
            authorsMap.set(author.id, author);
          });
          setAuthors(authorsMap);
        }
      }
    }
    
    if (error) {
      console.error('Error fetching spots:', error);
      setError('スポットの読み込みに失敗しました');
    }
    setIsLoading(false);
  };

  const initMap = async () => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
    });

    try {
      const google = await loader.load();
      const mapInstance = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 35.6762, lng: 139.6503 },
        zoom: 12,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      spots.forEach((spot: any) => {
        new google.maps.Marker({
          position: { lat: spot.lat, lng: spot.lng },
          map: mapInstance,
          title: spot.name,
        });
      });

      setMap(mapInstance);
    } catch (error) {
      console.error('Google Maps読み込みエラー:', error);
    }
  };

  // 空状態コンポーネント
  const EmptyState = () => (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <Coffee size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">まだスポットがありません</h3>
        <p className="text-gray-500">新しいスポットが追加されるまでお待ちください</p>
      </div>
    </div>
  );

  // エラー状態コンポーネント
  const ErrorState = () => (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <AlertCircle size={48} className="text-red-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">読み込みエラー</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchSpots}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          再試行
        </button>
      </div>
    </div>
  );

  const GridView = () => (
    <div className="px-4 py-6">
      {/* Pinterest風マソンリーレイアウト */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredSpots.map((spot: any) => {
          const author = spot.author_id ? authors.get(spot.author_id) : null;
          return (
            <div key={spot.id} className="group break-inside-avoid mb-4">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                {/* 画像エリア - Pinterest風 */}
                <div className="relative overflow-hidden">
                  {spot.instagram_url ? (
                    <InstagramEmbed url={spot.instagram_url} />
                  ) : (
                    <img 
                      src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=600&fit=crop'}
                      alt={spot.name}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                      style={{ aspectRatio: 'auto' }}
                    />
                  )}
                  
                  {/* Pinterest風オーバーレイ */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-4 right-4 flex gap-2">
                      {/* ハートボタン - Pinterest風 */}
                      <button
                        onClick={() => toggleFavorite(spot.id)}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-full p-3 shadow-lg transform hover:scale-110 transition-all duration-200"
                      >
                        <Heart 
                          size={20} 
                          className={favorites.has(spot.id) ? "fill-white" : ""} 
                        />
                      </button>
                    </div>
                    
                    {/* 右下にフォローボタン */}
                    {author && (
                      <div className="absolute bottom-4 right-4">
                        <button
                          onClick={() => toggleFollow(author.id)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                            follows.has(author.id)
                              ? 'bg-gray-800 text-white hover:bg-gray-900'
                              : 'bg-white text-gray-800 hover:bg-gray-100'
                          }`}
                        >
                          {follows.has(author.id) ? 'フォロー中' : 'フォロー'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 情報エリア - 最小限 */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{spot.name}</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                    <MapPin size={12} />
                    <span>{spot.location}</span>
                  </div>
                  
                  {/* タグ - 最大2個まで */}
                  {spot.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {spot.tags.split(',').slice(0, 2).map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* 投稿者情報 - コンパクト */}
                  {author && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <UserCircle size={12} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {author.display_name || author.username}
                        </div>
                      </div>
                      {spot.instagram_url && (
                        <a 
                          href={spot.instagram_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        >
                          <Eye size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MapPin size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SpottMap</h1>
            </div>
            
            {/* ナビゲーション */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <UserCircle size={12} className="text-white" />
                    </div>
                    <span className="font-medium">{user.email?.split('@')[0]}</span>
                  </div>
                  <a href="/mymap"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    <Heart size={16} />
                    マイマップ
                  </a>
                  <a href="/follow"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    <User size={16} />
                    フォロー一覧
                  </a>
                  <a href="/admin"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    <Plus size={16} />
                    スポット登録
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    <LogOut size={16} />
                    ログアウト
                  </button>
                </>
              ) : (
                <a href="/auth"
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                >
                  <LogIn size={16} />
                  ログイン
                </a>
              )}
            </div>

            {/* モバイルハンバーガーボタン */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${isMobileMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'}`}></span>
                  <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm my-0.5 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${isMobileMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'}`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-600">
                    {user.email?.split('@')[0]} でログイン中
                  </div>
                  <a href="/mymap" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                    マイマップ
                  </a>
                  <a href="/follow" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                    フォロー一覧
                  </a>
                  <a href="/admin" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                    スポット登録
                  </a>
                  <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                    ログアウト
                  </button>
                </>
              ) : (
                <a href="/auth" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                  ログイン
                </a>
              )}
            </div>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto">
        {/* 検索・フィルターセクション - ヘッダー直下に移動 */}
        <div className="bg-white border-b border-gray-100 shadow-sm pt-6">
          <div className="px-6 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* 検索バー - プレースホルダー変更 */}
              <div className="relative flex-1 max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="カフェ、渋谷、おしゃれ..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* 表示切替のみ */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                    viewMode === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Grid size={16} />
                  カード
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                    viewMode === 'map' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <MapIcon size={16} />
                  地図
                </button>
              </div>
            </div>
            
            {/* 検索結果表示 */}
            {searchTerm && (
              <div className="mt-4 text-sm text-gray-600">
                <span className="font-medium">{filteredSpots.length}件</span>のスポットが見つかりました
                {searchTerm && (
                  <span className="ml-2">
                    「<span className="font-medium text-blue-600">{searchTerm}</span>」の検索結果
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* メイン表示エリア */}
        <div className="min-h-96">
          {isLoading ? (
            // ローディング文言をシンプル化
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-gray-700">スポットを読み込み中...</p>
                  <p className="text-gray-500">少々お待ちください</p>
                </div>
              </div>
            </div>
          ) : error ? (
            <ErrorState />
          ) : filteredSpots.length === 0 ? (
            <EmptyState />
          ) : viewMode === 'map' ? (
            <div id="map" className="w-full h-96 rounded-lg mx-6 mt-6 shadow-lg"></div>
          ) : (
            <GridView />
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MapPin size={18} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-lg">SpottMap</div>
                <div className="text-sm text-gray-300">感度の高いローカルスポットを発見</div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              &copy; 2024 SpottMap
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}