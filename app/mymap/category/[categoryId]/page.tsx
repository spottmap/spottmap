'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, X, MapPin, Share2, Plus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// スポット詳細モーダルコンポーネント
const SpotDetailModal = ({ spot, isOpen, onClose }) => {
  if (!isOpen || !spot) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100] p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-blue-600">SpottMap</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-600 hover:text-red-500 transition-colors">
              <Heart size={20} />
            </button>
            <button className="p-2 text-gray-600 hover:text-blue-500 transition-colors">
              <Share2 size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 画像 */}
        <div className="aspect-square bg-gray-100">
          <img 
            src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=600&fit=crop'}
            alt={spot.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* スポット情報 */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {spot.name}
          </h1>
          
          {spot.location && (
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <MapPin size={16} />
              <span>{spot.location}</span>
            </div>
          )}

          {spot.description && (
            <p className="text-gray-700 leading-relaxed mb-6">
              {spot.description}
            </p>
          )}

          {/* Instagram投稿があれば表示 */}
          {spot.instagram_url && (
            <div className="border-t pt-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Instagram投稿
              </h3>
              <div className="bg-gray-100 rounded-lg p-3">
                <a 
                  href={spot.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm break-all"
                >
                  {spot.instagram_url}
                </a>
              </div>
            </div>
          )}

          {/* 詳細情報 */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              詳細情報
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {spot.price && (
                <div>
                  <span className="font-medium text-gray-700">価格帯:</span>
                  <span className="ml-2 text-gray-600">{spot.price}</span>
                </div>
              )}
              
              {spot.hours && (
                <div>
                  <span className="font-medium text-gray-700">営業時間:</span>
                  <span className="ml-2 text-gray-600">{spot.hours}</span>
                </div>
              )}
              
              {spot.phone && (
                <div>
                  <span className="font-medium text-gray-700">電話番号:</span>
                  <span className="ml-2 text-gray-600">{spot.phone}</span>
                </div>
              )}
              
              {spot.website && (
                <div>
                  <span className="font-medium text-gray-700">ウェブサイト:</span>
                  <a 
                    href={spot.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700"
                  >
                    公式サイト
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId;
  
  const [user, setUser] = useState(null);
  const [category, setCategory] = useState(null);
  const [categorySpots, setCategorySpots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // モーダル状態
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user && categoryId) {
          await fetchCategoryData(categoryId);
          await fetchCategorySpots(categoryId, user);
        }
      } catch (error) {
        console.error('認証エラー:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [categoryId]);

  const fetchCategoryData = async (categoryId) => {
    try {
      if (categoryId === 'all') {
        setCategory({ name: 'すべてのスポット' });
        return;
      }
      
      const { data, error } = await supabase
        .from('map_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      setCategory(data);
    } catch (error) {
      console.error('カテゴリ取得エラー:', error);
    }
  };

  const fetchCategorySpots = async (categoryId, currentUser) => {
    try {
      if (categoryId === 'all') {
        const { data: spotsData } = await supabase
          .from('spots')
          .select('*')
          .eq('user_id', currentUser.id);
        
        setCategorySpots(spotsData || []);
        return;
      }
      
      const { data: spotCategoriesData } = await supabase
        .from('spot_categories')
        .select('spot_id')
        .eq('category_id', categoryId);
      
      if (spotCategoriesData && spotCategoriesData.length > 0) {
        const spotIds = spotCategoriesData.map(sc => sc.spot_id);
        
        const { data: spotsData } = await supabase
          .from('spots')
          .select('*')
          .in('id', spotIds);
        
        setCategorySpots(spotsData || []);
      }
    } catch (error) {
      console.error('スポット取得エラー:', error);
    }
  };

  const handleSpotClick = (spot) => {
    setSelectedSpot(spot);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSpot(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span>マイマップに戻る</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {category?.name || 'マイマップ'}
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <a href="/admin"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          スポット登録
        </a>
      </div>
    </div>
  </div>
</header>

      <main className="max-w-7xl mx-auto p-6">
        {categorySpots.length === 0 ? (
          <div className="text-center py-12">
            <Heart size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              スポットがありません
            </h2>
            <p className="text-gray-600">
              このマイマップにはまだスポットが登録されていません
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {categorySpots.map((spot) => (
              <div 
                key={spot.id} 
                className="aspect-square bg-white cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleSpotClick(spot)}
              >
                <img 
                  src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=400&fit=crop'}
                  alt={spot.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* スポット詳細モーダル */}
      <SpotDetailModal 
        spot={selectedSpot}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}