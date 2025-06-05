'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapIcon, Heart, Share2, User, LogIn, LogOut, Plus, UserCircle, Coffee, Eye } from 'lucide-react';
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
        className="w-full h-full object-cover"
      />
    );
  }

  if (embedError) {
    return (
      <img 
        src={fallbackImage} 
        alt={spotName}
        className="w-full h-full object-cover"
      />
    );
  }

  if (!showEmbed) {
    return (
      <div className="relative w-full h-full">
        <img 
          src={fallbackImage} 
          alt={spotName}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setShowEmbed(true)}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer bg-black bg-opacity-30"
             onClick={() => setShowEmbed(true)}>
          <div className="bg-white px-2 py-1 rounded text-xs font-medium">
            📸 表示
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <blockquote 
        className="instagram-media" 
        data-instgrm-captioned 
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          maxWidth: '100%',
          minWidth: '240px',
          width: '100%',
          height: '100%'
        }}
        onError={() => setEmbedError(true)}
      >
        <div style={{ padding: '8px' }}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Instagram投稿を見る
          </a>
        </div>
      </blockquote>
    </div>
  );
};

export default function CategorySpotsPage() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [categorySpots, setCategorySpots] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [follows, setFollows] = useState(new Set());
  const [authors, setAuthors] = useState(new Map());
  const router = useRouter();
  const params = useParams();
  const categoryId = params.categoryId;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user && categoryId) {
        await fetchCategoryAndSpots(user.id, categoryId);
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [categoryId]);

  const fetchCategoryAndSpots = async (userId, categoryId) => {
  try {
    setLoading(true);
    
    // 'favorites'の場合は特別処理
if (categoryId === 'favorites') {
  // 全お気に入りスポット表示
  setCategory({ 
    name: 'すべてのスポット', 
    color: '#6B7280',
    id: 'favorites'
  });
  await fetchAllFavoriteSpots(userId);
  return;
}

    
    // カテゴリ情報取得
    const { data: categoryData, error: categoryError } = await supabase
      .from('map_categories')
      .select('*')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .single();

    if (categoryError) {
      console.error('カテゴリ取得エラー:', categoryError);
      setLoading(false);
      return;
    }

      setCategory(categoryData);

      // カテゴリに属するスポットID取得
      const { data: spotCategoriesData, error: spotCategoriesError } = await supabase
        .from('spot_categories')
        .select('spot_id')
        .eq('category_id', categoryId);

      if (spotCategoriesError) {
        console.error('スポットカテゴリ取得エラー:', spotCategoriesError);
        setLoading(false);
        return;
      }

      if (spotCategoriesData && spotCategoriesData.length > 0) {
        const spotIds = spotCategoriesData.map(sc => sc.spot_id);

        // スポット詳細取得
        const { data: spotsData, error: spotsError } = await supabase
          .from('spots')
          .select('*')
          .in('id', spotIds);

        if (spotsError) {
          console.error('スポット取得エラー:', spotsError);
          setLoading(false);
          return;
        }

        setCategorySpots(spotsData || []);

        // お気に入り情報取得
        const { data: favData } = await supabase
          .from('user_favorites')
          .select('spot_id')
          .eq('user_id', userId)
          .in('spot_id', spotIds);

        if (favData) {
          setFavorites(new Set(favData.map(fav => fav.spot_id)));
        }

        // 著者情報取得
        const authorIds = spotsData
          ?.filter(spot => spot.author_id)
          .map(spot => spot.author_id) || [];
        
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

        // フォロー情報取得
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);
        
        if (followData) {
          setFollows(new Set(followData.map(follow => follow.following_id)));
        }
      } else {
        setCategorySpots([]);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };
const fetchAllFavoriteSpots = async (userId) => {
  try {
    // 全お気に入りスポットID取得
    const { data: favData, error: favError } = await supabase
      .from('user_favorites')
      .select('spot_id')
      .eq('user_id', userId);

    if (favError) throw favError;

    if (favData && favData.length > 0) {
      const spotIds = favData.map(fav => fav.spot_id);

      // スポット詳細取得
      const { data: spotsData, error: spotsError } = await supabase
        .from('spots')
        .select('*')
        .in('id', spotIds);

      if (spotsError) throw spotsError;

      setCategorySpots(spotsData || []);
      setFavorites(new Set(spotIds));

      // 著者情報取得
      const authorIds = spotsData
        ?.filter(spot => spot.author_id)
        .map(spot => spot.author_id) || [];
      
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

      // フォロー情報取得
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      if (followData) {
        setFollows(new Set(followData.map(follow => follow.following_id)));
      }
    } else {
      setCategorySpots([]);
    }
  } catch (error) {
    console.error('お気に入りスポット取得エラー:', error);
  }
};
  const toggleFavorite = async (spotId) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    const isFavorited = favorites.has(spotId);
    
    try {
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
          setCategorySpots(prev => prev.filter(spot => spot.id !== spotId));
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
    } catch (error) {
      console.error('お気に入り操作に失敗:', error);
    }
  };

  const toggleFollow = async (authorId) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    const isFollowing = follows.has(authorId);
    
    try {
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
    } catch (error) {
      console.error('フォロー操作に失敗:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setFavorites(new Set());
    setCategorySpots([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">スポットを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeft size={20} />
                  <span>マイマップに戻る</span>
                </button>
                <h1 className="text-xl font-bold text-gray-900">{category?.name || 'カテゴリ'}</h1>
              </div>
              
              <a href="/auth" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <LogIn size={18} />
                ログイン
              </a>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Coffee size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
          <p className="text-gray-600 mb-8">お気に入りスポットを表示するにはログインしてください。</p>
          <a href="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <LogIn size={20} />
            ログイン
          </a>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeft size={20} />
                  <span>マイマップに戻る</span>
                </button>
                <h1 className="text-xl font-bold text-gray-900">カテゴリが見つかりません</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Coffee size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">カテゴリが見つかりません</h2>
          <p className="text-gray-600 mb-8">指定されたカテゴリは存在しないか、アクセス権限がありません。</p>
          <button 
            onClick={() => router.push('/mymap')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            マイマップに戻る
          </button>
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
              <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
                <span>マイマップに戻る</span>
              </button>
              <h1 className="text-xl font-bold text-gray-900">{category.name}</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* 地図で見るボタン */}
              <button
                onClick={() => window.location.href = `/?category=${categoryId}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MapIcon size={18} />
                地図で見る
              </button>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserCircle size={18} />
                <span>{user.email?.split('@')[0]}</span>
              </div>
              
              <a href="/admin" className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Plus size={18} />
                スポット登録
              </a>
              
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                <LogOut size={18} />
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto p-6">
        {/* 統計情報 */}
        <div 
          className="text-white rounded-lg p-6 mb-6"
          style={{ 
            background: `linear-gradient(135deg, ${category.color}CC, ${category.color}FF)` 
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{category.name}</h2>
              <p className="opacity-90">このマイマップに保存されたスポットの一覧です</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{categorySpots.length}</div>
              <div className="text-sm opacity-80">スポット</div>
            </div>
          </div>
        </div>

        {/* スポット一覧 */}
        {categorySpots.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Coffee size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">このマイマップにはスポットがありません</h3>
              <p className="text-gray-500 mb-6">気になるスポットを♡ボタンで保存して、マイマップに追加してみましょう</p>
              <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                スポットを探す
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categorySpots.map((spot) => {
              const author = spot.author_id ? authors.get(spot.author_id) : null;
              return (
                <div key={spot.id} className="group break-inside-avoid mb-4">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    {/* 画像エリア - Pinterest風 */}
                    <div className="relative overflow-hidden">
                      {spot.instagram_url ? (
                        <div className="aspect-square">
                          <InstagramEmbed 
                            url={spot.instagram_url}
                            fallbackImage={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=600&fit=crop'}
                            spotName={spot.name}
                          />
                        </div>
                      ) : (
                        <div className="aspect-square">
                          <img 
                            src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=600&fit=crop'}
                            alt={spot.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
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
                        <MapIcon size={12} />
                        <span>{spot.location}</span>
                      </div>
                      
                      {/* タグ - 最大2個まで */}
                      {spot.tags && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {spot.tags.split(',').slice(0, 2).map((tag, index) => (
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
        )}
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2024 SpottMap - あなただけの特別なマップ</p>
      </footer>
    </div>
  );
}