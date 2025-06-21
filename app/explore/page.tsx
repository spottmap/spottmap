'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, MapPin, Heart, Star, TrendingUp, Clock, Grid3X3, List, X } from 'lucide-react';
import supabase from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';

// Instagram風検索バー
const SearchBar = ({ searchQuery, setSearchQuery, onSearch }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <form onSubmit={handleSubmit} className="relative">
          <div className={`flex items-center bg-gray-100 rounded-xl transition-all duration-200 ${
            isFocused ? 'ring-2 ring-blue-500 bg-white' : ''
          }`}>
            <Search size={20} className="ml-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="スポットを検索..."
              className="w-full px-4 py-3 bg-transparent focus:outline-none text-gray-900 placeholder-gray-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mr-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
            <button
              type="button"
              className="mr-3 p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="フィルター"
            >
              <Filter size={18} className="text-gray-600" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// タブ切り替え
const ExploreTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'trending', label: '人気', icon: TrendingUp },
    { id: 'recent', label: '新着', icon: Clock },
    { id: 'nearby', label: '近くのスポット', icon: MapPin },
    { id: 'saved', label: '保存済み', icon: Heart }
  ];

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === id
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
              {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// スポットカード（Instagram風）
const SpotCard = ({ spot, onToggleFavorite, isFavorited }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
      {/* 画像部分 */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=400&fit=crop'}
          alt={spot.name}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* ハートボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(spot.id);
          }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
        >
          <Heart
            size={16}
            className={`${
              isFavorited
                ? 'text-red-500 fill-current'
                : 'text-gray-600 hover:text-red-500'
            } transition-colors`}
          />
        </button>

        {/* 評価 */}
        {spot.rating && (
          <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-current" />
            {spot.rating}
          </div>
        )}
      </div>

      {/* コンテンツ部分 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{spot.name}</h3>
        <p className="text-gray-600 text-sm mb-2 line-clamp-1 flex items-center gap-1">
          <MapPin size={12} />
          {spot.location}
        </p>
        {spot.description && (
          <p className="text-gray-500 text-xs line-clamp-2">{spot.description}</p>
        )}
        
        {/* タグ */}
        {spot.tags && Array.isArray(spot.tags) && spot.tags.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-2">
    {spot.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// メインコンポーネント
export default function ExplorePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spots, setSpots] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('trending');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const router = useRouter();

  // 認証確認
  useEffect(() => {
    const checkAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  setUser(user);
  
  if (user && user.id && user.id !== 'null' && user.id !== null) {
    await fetchFavorites(user.id);
  }
};
    checkAuth();
  }, []);

  // スポット取得
  useEffect(() => {
    fetchSpots();
  }, [activeTab]);

  const fetchSpots = async () => {
    setLoading(true);
    try {
      let query = supabase.from('spots').select('*');
      
      // タブに応じてクエリを変更
      switch (activeTab) {
        case 'trending':
          query = query.order('created_at', { ascending: false }).limit(50);
          break;
        case 'recent':
          query = query.order('created_at', { ascending: false }).limit(30);
          break;
        case 'nearby':
          // 位置情報があれば距離順、なければ作成日順
          query = query.order('created_at', { ascending: false }).limit(30);
          break;
        case 'saved':
  if (user && user.id && user.id !== 'null' && user.id !== null) {
    const { data: favData } = await supabase
      .from('user_favorites')
      .select('spot_id')
      .eq('user_id', user.id);
            
            if (favData && favData.length > 0) {
              const spotIds = favData.map(fav => fav.spot_id);
              query = query.in('id', spotIds);
            } else {
              setSpots([]);
              setLoading(false);
              return;
            }
          } else {
            setSpots([]);
            setLoading(false);
            return;
          }
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setSpots(data || []);
    } catch (error) {
  console.error('スポット取得エラー詳細:', JSON.stringify(error, null, 2));
  console.error('エラーメッセージ:', error.message);
  console.error('エラーコード:', error.code);
  setSpots([]);
} finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async (userId) => {
  if (!userId || userId === 'null' || userId === null) {
    console.log('無効なuserIdのためfetchFavorites中止:', userId);
    return;
  }
  
  try {
    const { data } = await supabase
      .from('user_favorites')
      .select('spot_id')
      .eq('user_id', userId);
      
      if (data) {
        setFavorites(new Set(data.map(fav => fav.spot_id)));
      }
    } catch (error) {
      console.error('お気に入り取得エラー:', error);
    }
  };

  const handleToggleFavorite = async (spotId) => {
  if (!user || !user.id || user.id === 'null' || user.id === null) {
    router.push('/auth');
    return;
  }

    const isFavorited = favorites.has(spotId);
    
    try {
      if (isFavorited) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('spot_id', spotId);
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(spotId);
          return newSet;
        });
      } else {
        await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            spot_id: spotId
          });
        
        setFavorites(prev => new Set([...prev, spotId]));
      }
    } catch (error) {
      console.error('お気に入り操作エラー:', error);
    }
  };

  const handleSearch = () => {
    // 検索機能の実装
    console.log('検索:', searchQuery);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MapPin size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                探索
              </h1>
            </div>

            {/* 表示切り替え */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={viewMode === 'grid' ? 'リスト表示' : 'グリッド表示'}
              >
                {viewMode === 'grid' ? <List size={20} /> : <Grid3X3 size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 検索バー */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
      />

      {/* タブ */}
      <ExploreTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-lg text-gray-600">読み込み中...</div>
            </div>
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              {activeTab === 'saved' && !user
                ? 'ログインしてお気に入りスポットを確認'
                : 'スポットが見つかりませんでした'}
            </div>
            {activeTab === 'saved' && !user && (
              <button
                onClick={() => router.push('/auth')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ログイン
              </button>
            )}
          </div>
        ) : (
          <div className={`${
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-4'
          }`}>
            {spots.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={spot}
                onToggleFavorite={handleToggleFavorite}
                isFavorited={favorites.has(spot.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 下部ナビゲーション */}
      <BottomNavigation user={user} />
    </div>
  );
}