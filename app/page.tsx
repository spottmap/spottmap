'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader } from '@googlemaps/js-api-loader';

// lucide-reactアイコンを個別インポート
import { Grid } from 'lucide-react';
import { Map as MapIcon } from 'lucide-react';
import { Heart } from 'lucide-react';
import { Share2 } from 'lucide-react';
import { User } from 'lucide-react';
import { LogIn } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { Plus } from 'lucide-react';
import { UserCircle } from 'lucide-react';

// 静的生成を無効化（環境変数が必要なため）
export const dynamic = 'force-dynamic';

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
  const [follows, setFollows] = useState(new Set());
  const [authors, setAuthors] = useState(new Map<string, any>());
  
  useEffect(() => {
    // 認証状態をチェック
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // ログイン済みの場合、お気に入りとフォローデータを取得
      if (user) {
        // お気に入りデータを取得
        const { data: favData } = await supabase
          .from('user_favorites')
          .select('spot_id')
          .eq('user_id', user.id);
        
        if (favData) {
          setFavorites(new Set(favData.map(fav => fav.spot_id)));
        }

        // フォローデータを取得
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setFavorites(new Set());
    setFollows(new Set());
  };

  // お気に入りトグル機能
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

  // フォロートグル機能
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
    // spotsの基本情報を取得
    const { data, error } = await supabase
      .from('spots')
      .select('*');
    
    if (data) {
      setSpots(data);
      
      // author_idがあるスポットのauthor情報を取得
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
      {spots.map((spot: any) => {
        const author = spot.author_id ? authors.get(spot.author_id) : null;
        return (
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
              
              {/* ボタンエリア */}
              <div className="absolute top-3 right-3 flex gap-2">
                {/* フォローボタン */}
                {author && (
                  <button
                    onClick={() => toggleFollow(author.id)}
                    className={`bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200 shadow-md hover:shadow-lg ${
                      follows.has(author.id) 
                        ? 'bg-blue-500 text-white' 
                        : ''
                    }`}
                  >
                    {follows.has(author.id) ? (
                      <User size={18} className="text-white" />
                    ) : (
                      <Plus size={18} className="text-gray-600 hover:text-blue-500" />
                    )}
                  </button>
                )}
                
                {/* お気に入りボタン */}
                <button
                  onClick={() => toggleFavorite(spot.id)}
                  className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Heart 
                    size={18} 
                    className={favorites.has(spot.id) 
                      ? "text-red-500 fill-red-500" 
                      : "text-gray-400 hover:text-red-400"
                    } 
                  />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg">{spot.name}</h3>
              </div>
              
              <p className="text-gray-600 text-sm mb-2">{spot.location}</p>
              <p className="text-gray-700 text-sm mb-3">{spot.description}</p>
              
              {spot.tags && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {spot.tags.split(',').map((tag: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-pink-100 text-pink-600 text-xs rounded-full">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              
              {/* 投稿者情報 */}
              {author && (
                <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCircle size={20} className="text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {author.display_name || author.username}
                      </div>
                      <div className="text-xs text-gray-500">
                        {author.instagram_username}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(author.id)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      follows.has(author.id)
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {follows.has(author.id) ? 'フォロー中' : 'フォロー'}
                  </button>
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
        );
      })}
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
                    href="/mymap"
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Heart size={18} />
                    マイマップ
                  </a>
                  <a
                    href="/follow"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <User size={18} />
                    フォロー一覧
                  </a>
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
                <div className="text-2xl font-bold">{authors.size}</div>
                <div className="text-sm text-blue-100">投稿者</div>
              </div>
              {user && (
                <>
                  <div>
                    <div className="text-2xl font-bold">{favorites.size}</div>
                    <div className="text-sm text-blue-100">お気に入り</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{follows.size}</div>
                    <div className="text-sm text-blue-100">フォロー中</div>
                  </div>
                </>
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
              <MapIcon size={18} />
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
        <p>&copy; 2024 SpottMap - 統一フォローシステム完成・お気に入り機能付き</p>
      </footer>
    </div>
  );
}