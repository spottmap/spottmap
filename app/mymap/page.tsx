'use client';
import React, { useState, useEffect } from 'react';
import { Grid, Map, Heart, Share2, User, LogIn, LogOut, Plus, UserCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Instagram埋め込みコンポーネント
const InstagramEmbed = ({ url, fallbackImage, spotName }) => {
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  const getInstagramPostId = (url) => {
    if (!url) return null;
    const match = url.match(/\/p\/([^\/\?]+)/);
    return match ? match[1] : null;
  };

  const postId = getInstagramPostId(url);

  useEffect(() => {
    if (showEmbed && postId) {
      if (!window.instgrm) {
        const script = document.createElement('script');
        script.src = 'https://www.instagram.com/embed.js';
        script.async = true;
        script.onload = () => {
          if (window.instgrm) {
            window.instgrm.Embeds.process();
          }
        };
        document.body.appendChild(script);
      } else {
        window.instgrm.Embeds.process();
      }
    }
  }, [showEmbed, postId]);

  if (!url || !postId) {
    return (
      <img 
        src={fallbackImage} 
        alt={spotName}
        className="w-full h-48 object-cover"
      />
    );
  }

  if (embedError) {
    return (
      <img 
        src={fallbackImage} 
        alt={spotName}
        className="w-full h-48 object-cover"
      />
    );
  }

  if (!showEmbed) {
    return (
      <div className="relative">
        <img 
          src={fallbackImage} 
          alt={spotName}
          className="w-full h-48 object-cover cursor-pointer"
          onClick={() => setShowEmbed(true)}
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
             onClick={() => setShowEmbed(true)}>
          <div className="bg-white px-4 py-2 rounded-lg text-sm font-medium">
            📸 Instagram投稿を表示
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-48 overflow-hidden">
      <blockquote 
        className="instagram-media" 
        data-instgrm-captioned 
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          maxWidth: '100%',
          minWidth: '326px',
          width: '100%',
          height: '100%'
        }}
        onError={() => setEmbedError(true)}
      >
        <div style={{ padding: '16px' }}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Instagram投稿を見る
          </a>
        </div>
      </blockquote>
    </div>
  );
};

export default function MyMapPage() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await fetchFavoriteSpots(user.id);
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const fetchFavoriteSpots = async (userId) => {
    try {
      setLoading(true);
      
      // お気に入りのspot_idを取得
      const { data: favData, error: favError } = await supabase
        .from('user_favorites')
        .select('spot_id')
        .eq('user_id', userId);

      if (favError) throw favError;

      if (favData && favData.length > 0) {
        const spotIds = favData.map(fav => fav.spot_id);
        setFavorites(new Set(spotIds));

        // お気に入りのスポット情報を取得
        const { data: spotsData, error: spotsError } = await supabase
          .from('spots')
          .select('*')
          .in('id', spotIds);

        if (spotsError) throw spotsError;

        setFavoriteSpots(spotsData || []);
      } else {
        setFavoriteSpots([]);
        setFavorites(new Set());
      }
    } catch (error) {
      console.error('お気に入りスポットの取得に失敗:', error);
      setFavoriteSpots([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (spotId) => {
    if (!user) return;

    const isFavorited = favorites.has(spotId);
    
    try {
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
          // お気に入りスポットリストからも削除
          setFavoriteSpots(prev => prev.filter(spot => spot.id !== spotId));
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
          // スポット情報を取得して追加
          const { data: spotData } = await supabase
            .from('spots')
            .select('*')
            .eq('id', spotId)
            .single();
          
          if (spotData) {
            setFavoriteSpots(prev => [...prev, spotData]);
          }
        }
      }
    } catch (error) {
      console.error('お気に入り操作に失敗:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setFavorites(new Set());
    setFavoriteSpots([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">マイマップを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeft size={20} />
                  <span>SpottMapに戻る</span>
                </a>
              </div>
              <a
                href="/auth"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogIn size={18} />
                ログイン
              </a>
            </div>
          </div>
        </header>

        {/* ログイン促進画面 */}
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="mb-8">
            <Heart size={64} className="mx-auto text-gray-300 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">マイマップ</h1>
            <p className="text-gray-600 text-lg mb-8">
              お気に入りのスポットを保存して、あなただけの特別な地図を作りましょう
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">マイマップの機能</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="flex items-start gap-3">
                <Heart size={20} className="text-red-500 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900">お気に入りスポット</h3>
                  <p className="text-gray-600 text-sm">気になるスポットをハートボタンで保存</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Map size={20} className="text-blue-500 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900">専用マップ</h3>
                  <p className="text-gray-600 text-sm">保存したスポットだけを表示</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Share2 size={20} className="text-green-500 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900">簡単共有</h3>
                  <p className="text-gray-600 text-sm">友達とお気に入りスポットを共有</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Plus size={20} className="text-purple-500 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900">無制限保存</h3>
                  <p className="text-gray-600 text-sm">好きなだけスポットを保存可能</p>
                </div>
              </div>
            </div>
          </div>

          <a
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
          >
            <LogIn size={20} />
            ログインしてマイマップを始める
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
                <span>SpottMapに戻る</span>
              </a>
              <h1 className="text-xl font-bold text-gray-900">マイマップ</h1>
            </div>
            
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto">
        {/* 統計情報 */}
        <div className="p-6 bg-gradient-to-r from-red-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">あなたのお気に入りスポット</h2>
              <p className="text-red-100">保存したスポットをまとめて確認できます</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{favoriteSpots.length}</div>
              <div className="text-sm text-red-100">お気に入りスポット</div>
            </div>
          </div>
        </div>

        {/* スポット表示エリア */}
        <div className="p-6">
          {favoriteSpots.length === 0 ? (
            // 空の状態
            <div className="text-center py-16">
              <Heart size={64} className="mx-auto text-gray-300 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                まだお気に入りスポットがありません
              </h3>
              <p className="text-gray-600 mb-8">
                気になるスポットを見つけたら、ハートボタンを押してお気に入りに追加しましょう
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Map size={20} />
                スポットを探しに行く
              </a>
            </div>
          ) : (
            // お気に入りスポットのグリッド表示
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteSpots.map((spot) => (
                <div key={spot.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {spot.instagram_url ? (
                      <InstagramEmbed 
                        url={spot.instagram_url}
                        fallbackImage={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop'}
                        spotName={spot.name}
                      />
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
                        {spot.tags.split(',').map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
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
                            className="text-sm text-pink-500 hover:text-pink-600 flex items-center gap-1"
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
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2024 SpottMap - あなただけの特別なマップ</p>
      </footer>
    </div>
  );
}