'use client';
import React, { useState, useEffect } from 'react';
import { Grid, Map, Heart, Share2, User, LogIn, LogOut, Plus, UserCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Loader } from '@googlemaps/js-api-loader';

// Google Maps API の型定義
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
    
    // Instagram埋め込みスクリプトを動的に読み込み
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
          className="relative group cursor-pointer"
          onClick={handleShowEmbed}
        >
          <img 
            src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop"
            alt="フォールバック画像"
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
            <div className="text-white text-center">
              <div className="text-2xl mb-2">📸</div>
              <div className="text-sm font-medium">Instagram投稿を表示</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          {isLoading && (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-lg">
              <div className="text-gray-500">Instagram投稿を読み込み中...</div>
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
              borderRadius: '3px',
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
  const [viewMode, setViewMode] = useState('map');
  const [spots, setSpots] = useState([]);
  const [map, setMap] = useState(null);
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  
  useEffect(() => {
    // 認証状態をチェック
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // ログイン済みの場合、お気に入りデータを取得
      if (user) {
        const { data: favData } = await supabase
          .from('user_favorites')
          .select('spot_id')
          .eq('user_id', user.id);
        
        if (favData) {
          setFavorites(new Set(favData.map(fav => fav.spot_id)));
        }
      }
    };
    
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setFavorites(new Set());
  };

  // お気に入りトグル機能
  const toggleFavorite = async (spotId: number) => {
    if (!user) {
      // 未ログインの場合はログインページへ
      window.location.href = '/auth';
      return;
    }

    const isFavorited = favorites.has(spotId);
    
    if (isFavorited) {
      // お気に入り解除
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
      // お気に入り追加
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

  useEffect(() => {
    fetchSpots();
    if (viewMode === 'map') {
      initMap();
    }
  }, [viewMode]);

  const fetchSpots = async () => {
    const { data, error } = await supabase
      .from('spots')
      .select('*');
    
    if (data) {
      setSpots(data);
    }
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

  const refreshData = () => {
    fetchSpots();
  };

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {spots.map((spot: any) => (
        <div key={spot.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="relative">
            {spot.instagram_url ? (
              <InstagramEmbed url={spot.instagram_url} />
            ) : (
              <img 
                src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop'}
                alt={spot.name}
                className="w-full h-48 object-cover"
              />
            )}
            
            {/* お気に入りボタン */}
            <button
              onClick={() => toggleFavorite(spot.id)}
              className="absolute top-3 right-3 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Heart 
                size={20} 
                className={favorites.has(spot.id) 
                  ? "text-red-500 fill-red-500" 
                  : "text-gray-400 hover:text-red-400"
                } 
              />
            </button>
          </div>
          
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{spot.name}</h3>
            <p className="text-gray-600 text-sm mb-2">{spot.location}</p>
            <p className="text-gray-700 text-sm mb-3">{spot.description}</p>
            
            {spot.tags && (
              <div className="flex flex-wrap gap-1 mb-3">
                {spot.tags.split(',').map((tag: string, index: number) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">@{spot.instagram_user}</span>
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                  <Share2 size={16} />
                </button>
                {spot.instagram_url && (
                  <a 
                    href={spot.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    📸 Instagram投稿を見る
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">SpottMap</h1>
            </div>
            
            {/* ナビゲーション */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UserCircle size={18} />
                    <span>{user.email?.split('@')[0]}</span>
                  </div>
                  <a
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={18} />
                    スポット登録
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <LogOut size={18} />
                    ログアウト
                  </button>
                </>
              ) : (
                <a
                  href="/auth"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn size={18} />
                  ログイン
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto">
        {/* 統計情報 */}
        <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">感度の高いローカルスポットを発見</h2>
              <p className="text-blue-100">Instagram×地図で新しい場所を見つけよう</p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <div className="text-2xl font-bold">{spots.length}</div>
                <div className="text-sm text-blue-100">登録スポット</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{new Set(spots.map((s: any) => s.instagram_user)).size}</div>
                <div className="text-sm text-blue-100">投稿者</div>
              </div>
              {user && (
                <div>
                  <div className="text-2xl font-bold">{favorites.size}</div>
                  <div className="text-sm text-blue-100">お気に入り</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* コントロールパネル */}
        <div className="p-4 bg-white border-b flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'map' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Map size={18} />
              地図表示
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid size={18} />
              カード表示
            </button>
          </div>
          
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            データ更新
          </button>
        </div>

        {/* メイン表示エリア */}
        <div className="min-h-96">
          {viewMode === 'map' ? (
            <div id="map" className="w-full h-96"></div>
          ) : (
            <GridView />
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2024 SpottMap - Instagram連携実装済み・お気に入り機能付き</p>
      </footer>
    </div>
  );
}