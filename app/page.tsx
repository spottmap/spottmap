'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import BottomNavigation from './components/BottomNavigation';

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
  Coffee,
  X
} from 'lucide-react';

export const dynamic = 'force-dynamic';

declare global {
  interface Window {
    google: any;
  }
}

import supabase from './lib/supabase';

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

// ローディング付き画像コンポーネント
const ImageWithLoading = ({ src, alt, className }: { src: string; alt: string; className: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative">
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
      {hasError ? (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
          <span className="text-gray-500 text-sm">画像を読み込めません</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={className}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}
    </div>
  );
};

// スポット詳細モーダルコンポーネント
const SpotDetailModal = ({ spot, isOpen, onClose, user, favorites, toggleFavorite, handleAddNewSpot }: any) => {
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
          <button 
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 画像 */}
        <div className="aspect-square bg-gray-100">
          <ImageWithLoading 
            src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=600&fit=crop'}
            alt={spot.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* スポット情報 */}
        <div className="p-6">
        <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {spot.name}
              </h1>
              
              {spot.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={16} />
                  <span>{spot.location}</span>
                </div>
              )}
            </div>
            
            {/* アクションボタン群 - スポット名の右側 */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              
                <button 
  onClick={async () => {
  if (!spot.id) {
    // 新規スポット追加 → マイマップ追加
    await handleAddNewSpot(spot);
    return;
  }
  if (spot.id && spot.id !== 'null') {
    toggleFavorite(spot.id);
  } else {
    console.error('無効なspotId:', spot.id);
  }
}}
  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm whitespace-nowrap ${
    spot.id && favorites.has(spot.id) 
      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
  }`}
>
  <Heart size={14} className={spot.id && favorites.has(spot.id) ? "fill-red-600" : ""} />
  <span className="font-medium">
    {spot.id && favorites.has(spot.id) ? 'マイマップ済み' : 'マイマップに追加'}
  </span>
</button>              
              
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: spot.name,
                      text: spot.description,
                      url: window.location.href
                    });
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm whitespace-nowrap"
              >
                <Share2 size={14} />
                <span className="font-medium">シェア</span>
              </button>
            </div>
          </div>

          {spot.description && (
            <p className="text-gray-700 leading-relaxed mb-6">
              {spot.description}
            </p>
          )}

          {/* タグ */}
          {spot.tags && (
            <div className="flex flex-wrap gap-2 mb-6">
              {spot.tags.split(',').map((tag: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Instagram投稿 */}
          {spot.instagram_url && (
            <div className="border-t pt-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Instagram投稿
              </h3>
              <InstagramEmbed url={spot.instagram_url} />
              
              <div className="mt-4">
                <a 
                  href={spot.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                >
                  <Eye size={16} />
                  Instagram で見る
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {
  const [spots, setSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [visibleCandidatesCount, setVisibleCandidatesCount] = useState(10);
  const [map, setMap] = useState(null);
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [follows, setFollows] = useState(new Set());
  const [authors, setAuthors] = useState(new Map<string, any>());
  const [profileImage, setProfileImage] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({
  existing: [],
  newCandidates: [],
  showManualInput: false
});
const [isSearching, setIsSearching] = useState(false);
const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

useEffect(() => {
  // クライアントサイドでのみURLパラメータを取得
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    setCategoryId(categoryParam);
  }
}, []);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [showSpotModal, setShowSpotModal] = useState(false);
  
  useEffect(() => {
    const fetchProfileImage = async (userId) => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('profile_image_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.profile_image_url) {
      setProfileImage(data.profile_image_url);
    }
  } catch (error) {
    console.error('プロフィール画像取得エラー:', error);
  }
};
    
    const checkAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  setUser(user);
  
  if (user && user.id && user.id !== 'null' && user.id !== null) {
    console.log('認証済みユーザー:', user.id);
    
    try {
      const { data: favData, error: favError } = await supabase
        .from('user_favorites')
        .select('spot_id')
        .eq('user_id', user.id);
      
      if (favError) {
        console.error('お気に入り取得エラー:', favError);
      } else if (favData) {
        setFavorites(new Set(favData.map(fav => fav.spot_id)));
      }

      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (followError) {
        console.error('フォロー取得エラー:', followError);
      } else if (followData) {
        setFollows(new Set(followData.map(follow => follow.following_id)));
      }
      
      // プロフィール画像取得を追加
      await fetchProfileImage(user.id);
    } catch (error) {
      console.error('認証データ取得エラー:', error);
    }
  } else {
    console.log('未認証またはユーザーIDが無効');
  }
};
    checkAuth();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSmartSearch(searchTerm);
    }, 500); // 500ms遅延でAPI呼び出しを制限

    return () => clearTimeout(timeoutId);
  }, [searchTerm, spots]);

  // 無限スクロール用useEffect
useEffect(() => {
  const handleScroll = () => {
    const loadMoreIndicator = document.getElementById('load-more-indicator');
    
    if (!loadMoreIndicator) {
      console.log('load-more-indicator が見つからない');
      return;
    }
    
    const indicatorRect = loadMoreIndicator.getBoundingClientRect();
    console.log('スクロール検出:', {
      indicatorTop: indicatorRect.top,
      windowHeight: window.innerHeight,
      visibleCount: visibleCandidatesCount,
      totalCount: searchResults.newCandidates.length
    });
    
    // インジケーターが画面に入ったら次の10件を読み込み
    if (indicatorRect.top <= window.innerHeight - 100 && visibleCandidatesCount < searchResults.newCandidates.length) {
      console.log('次の10件を読み込み:', visibleCandidatesCount, '->', Math.min(visibleCandidatesCount + 10, searchResults.newCandidates.length));
      setVisibleCandidatesCount(prev => Math.min(prev + 10, searchResults.newCandidates.length));
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [visibleCandidatesCount, searchResults.newCandidates.length]);

  // 検索が変わったら表示件数をリセット
  useEffect(() => {
    setVisibleCandidatesCount(10);
  }, [searchTerm]);

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

  // spotIdの有効性チェック
  if (!spotId || spotId === 'null' || spotId === 'undefined') {
    console.error('無効なspotId:', spotId);
    alert('スポットIDが無効です');
    return;
  }

  console.log('toggleFavorite実行:', { spotId, userId: user.id });

  const isFavorited = favorites.has(spotId);
  
  if (isFavorited) {
    console.log('お気に入りから削除中...');
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('spot_id', spotId);
    
    if (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました: ' + error.message);
    } else {
      console.log('削除成功');
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        newFavorites.delete(spotId);
        return newFavorites;
      });
    }
  } else {
    console.log('お気に入りに追加中...');
    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        spot_id: spotId
      });
    
    if (error) {
      console.error('追加エラー:', error);
      alert('追加に失敗しました: ' + error.message);
    } else {
      console.log('追加成功');
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
}, [categoryId]);

useEffect(() => {
  console.log('useEffect実行:', { 
    spotsLength: spots.length, 
    mapRefExists: !!mapRef.current 
  });
  
  if (spots.length > 0 && mapRef.current) {
    console.log('initMap呼び出し開始');
    setTimeout(() => initMap(), 100);
  } else if (spots.length > 0) {
    console.log('mapRef.currentが存在しない、500ms後に再試行');
    setTimeout(() => {
      if (mapRef.current) {
        console.log('再試行でinitMap呼び出し');
        initMap();
      }
    }, 500);
  }
}, [spots]);

  const fetchSpots = async () => {
  console.log('fetchSpots開始');
  setIsLoading(true);
  setError(null);
  
  let query = supabase.from('spots').select('*');
  
  // カテゴリ指定がある場合はフィルタリング
if (categoryId && categoryId !== 'all') {
  // カテゴリに属するスポットIDを取得
  const { data: spotCategoriesData, error: categoriesError } = await supabase
    .from('spot_categories')
    .select('spot_id')
    .eq('category_id', categoryId);

  console.log('categoryId:', categoryId);
  console.log('spotCategoriesData:', spotCategoriesData);
  console.log('categoriesError:', categoriesError);

  if (spotCategoriesData && spotCategoriesData.length > 0) {
    const spotIds = spotCategoriesData.map(item => item.spot_id);
    console.log('spotIds:', spotIds);
    query = query.in('id', spotIds);
  } else {
    // カテゴリにスポットがない場合は空配列
    setSpots([]);
    setFilteredSpots([]);
    setIsLoading(false);
    return;
  }
} else if (categoryId === 'all') {
  // 'all'の場合は全スポットを取得（フィルタリングしない）
  console.log('showing all spots');
}
  
  const { data, error } = await query;
    
    if (data) {
    console.log('取得したスポット数:', data.length);
    console.log('スポットデータ:', data);
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
  console.log('initMap called with spots:', spots);
  console.log('spots length:', spots.length);
  console.log('API Key存在:', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  console.log('mapRef存在:', !!mapRef.current);
  
  // DOM要素の存在確認（より厳密に）
  if (!mapRef.current) {
    console.error('Map element not found');
    // 少し待ってから再試行
    setTimeout(() => {
      if (mapRef.current && spots.length > 0) {
        initMap();
      }
    }, 500);
    return;
  }

  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    version: 'weekly',
  });

try {
    console.log('Google Maps読み込み開始...');
    const google = await loader.load();
    console.log('Google Maps読み込み成功');

    // スポットの中心座標を計算
    let center = { lat: 35.6762, lng: 139.6503 }; // デフォルト
    if (spots.length > 0) {
      const latSum = spots.reduce((sum, spot) => sum + spot.lat, 0);
      const lngSum = spots.reduce((sum, spot) => sum + spot.lng, 0);
      center = {
        lat: latSum / spots.length,
        lng: lngSum / spots.length
      };
    }

    const mapInstance = new google.maps.Map(mapRef.current, {
  center: center,
  zoom: 12,
  // 航空写真切り替えを無効化
  mapTypeControl: false,
  // その他のコントロールも整理
  streetViewControl: false,
  fullscreenControl: false,
  // モダンなスタイル
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#f5f5f5" }]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#c9c9c9" }]
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#f9f9f9" }]
    }
  ]
});

    spots.forEach((spot: any) => {
      const marker = new google.maps.Marker({
        position: { lat: spot.lat, lng: spot.lng },
        map: mapInstance,
        title: spot.name,
      });
      
      // マーカークリックでモーダル表示
      marker.addListener('click', () => {
        setSelectedSpot(spot);
        setShowSpotModal(true);
      });
    });

    setMap(mapInstance);
  } catch (error) {
    console.error('Google Maps読み込みエラー:', error);
  }
};

// Places API呼び出し関数（20件まで）
const searchPlacesAPI = async (query) => {
  try {
    const response = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        location: '35.6762,139.6503',
        radius: 50000
      }),
    });

    const data = await response.json();
    console.log('Places API結果数:', data.results?.length || 0);
    return data.results || [];
  } catch (error) {
    console.error('Places API検索エラー:', error);
    return [];
  }
};

// スマート検索関数（20件対応）
const performSmartSearch = async (searchQuery) => {
  if (!searchQuery.trim()) {
    setFilteredSpots(spots);
    setSearchResults({ existing: [], newCandidates: [], showManualInput: false });
    return;
  }

  setIsSearching(true);
  
  // 1. 既存データベース検索
  const existingSpots = spots.filter((spot) => 
    spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spot.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (spot.tags && spot.tags.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  let newCandidates = [];
  
  // 2. 既存スポットが少ない場合、Places APIで補完
  if (existingSpots.length < 3) {
    console.log('Places API検索開始');
    const rawCandidates = await searchPlacesAPI(searchQuery);
    
    // 重複チェック
    for (const candidate of rawCandidates) {
      const duplicates = await findDuplicates(candidate);
      candidate.isRegistered = duplicates.length > 0;
      if (candidate.isRegistered) {
        candidate.existingSpot = duplicates[0];
      }
    }
    
    newCandidates = rawCandidates;
    console.log('Places API検索完了:', newCandidates.length, '件');
  }
  
  // 最終結果設定
  const results = {
    existing: existingSpots,
    newCandidates: newCandidates,
    showManualInput: existingSpots.length === 0 && newCandidates.length === 0
  };
  
  setSearchResults(results);
  setFilteredSpots(existingSpots);
  setIsSearching(false);
};

// 距離計算（GPS座標）
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // 距離（メートル）
};

// 店名類似度計算
const calculateNameSimilarity = (name1, name2) => {
  const normalize = (str) => str.toLowerCase().replace(/[\s\-・]/g, '');
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  if (n1 === n2) return 1.0;
  
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

// レーベンシュタイン距離
const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// 重複判定
const findDuplicates = async (candidate) => {
  console.log('=== findDuplicates開始 ===');
  console.log('検索対象:', candidate.name, candidate.lat, candidate.lng);
  
  try {
    const { data: nearbySpots } = await supabase
      .from('spots')
      .select('*')
      .gte('lat', candidate.lat - 0.001)
      .lte('lat', candidate.lat + 0.001)
      .gte('lng', candidate.lng - 0.001)
      .lte('lng', candidate.lng + 0.001);
    
    console.log('既存スポット数:', nearbySpots?.length || 0);
    
    if (!nearbySpots || nearbySpots.length === 0) return [];
    
    const duplicates = [];
    
    for (const existingSpot of nearbySpots) {
      console.log('比較中:', existingSpot.name);
      
      const distance = calculateDistance(
        candidate.lat, candidate.lng,
        existingSpot.lat, existingSpot.lng
      );
      
      const nameSimilarity = calculateNameSimilarity(candidate.name, existingSpot.name);
      
      console.log(`- 距離: ${Math.round(distance)}m`);
      console.log(`- 類似度: ${Math.round(nameSimilarity * 100)}%`);
      
      const isDuplicate = (
        (distance < 10 && nameSimilarity > 0.7) || 
        (distance < 50 && nameSimilarity > 0.8) || 
        (distance < 100 && nameSimilarity > 0.95)
      );
      
      console.log(`- 重複判定: ${isDuplicate}`);
      
      if (isDuplicate) {
        duplicates.push({
          ...existingSpot,
          distance: Math.round(distance),
          similarity: Math.round(nameSimilarity * 100)
        });
      }
    }
    
    console.log('重複検出数:', duplicates.length);
    console.log('=== findDuplicates終了 ===');
    
    return duplicates.sort((a, b) => a.distance - b.distance);
    
  } catch (error) {
    console.error('重複チェックエラー:', error);
    return [];
  }
};

// タグ生成アルゴリズム
const generateOptimizedTags = (candidate) => {
  const tags = [];
  
  // 1. 店名から業種抽出
  const name = candidate.name.toLowerCase();
  const businessTypes = {
    'ラーメン': ['ラーメン', 'ramen', '麺'],
    'カフェ': ['カフェ', 'cafe', 'coffee', 'コーヒー'],
    '美容': ['美容', 'beauty', 'salon', 'ネイル', 'nail'],
    'レストラン': ['restaurant', 'dining'],
    '銀行': ['銀行', 'bank'],
    '博物館': ['博物館', 'museum'],
    '電子機器': ['apple', 'electronic', 'pc', 'phone']
  };
  
  Object.entries(businessTypes).forEach(([category, keywords]) => {
    if (keywords.some(keyword => name.includes(keyword))) {
      tags.push(category);
    }
  });
  
  // 2. 住所から地域抽出（正規表現パース）
  const location = candidate.location;
  const parseLocation = (address) => {
    const locationTags = [];
    
    // 都道府県抽出
    const prefectureMatch = address.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都?|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府?|大阪府?|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
    if (prefectureMatch) {
      locationTags.push(prefectureMatch[1]);
      // 短縮形も追加（東京都→東京、大阪府→大阪）
      const shortName = prefectureMatch[1].replace(/(都|府|県)$/, '');
      if (shortName !== prefectureMatch[1]) {
        locationTags.push(shortName);
      }
    }
    
    // 市区町村抽出
    const cityMatch = address.match(/([^\s　]+?[市区町村])/);
    if (cityMatch) {
      locationTags.push(cityMatch[1]);
      // 市区町村を除いた名前も追加（四日市市→四日市）
      const cityBase = cityMatch[1].replace(/[市区町村]$/, '');
      if (cityBase !== cityMatch[1]) {
        locationTags.push(cityBase);
      }
    }
    
    // 海外住所（カンマ・スペース区切りパーツをそのまま追加）
    if (!prefectureMatch) {
      const parts = address.split(/[,，\s　]+/).filter(part => part.length > 1);
      parts.forEach(part => {
        const cleanPart = part.trim()
          .replace(/^[0-9\-]+/, '') // 先頭の番地削除
          .replace(/[0-9]+$/, '');  // 末尾の番号削除
        if (cleanPart.length > 1) {
          locationTags.push(cleanPart);
        }
      });
    }
    
    return locationTags;
  };
  
  const locationTags = parseLocation(location);
  tags.push(...locationTags);
  
  // 3. Places APIタイプをフィルタリング
  const excludeTypes = ['establishment', 'point_of_interest', 'store', 'food', 
                       'meal_takeaway', 'tourist_attraction'];
  const usefulTypes = (candidate.types || []).filter(type => !excludeTypes.includes(type));
  tags.push(...usefulTypes);
  
  // 4. 重複除去（日本語優先）
  const duplicateMap = {
    'bank': '銀行',
    'restaurant': 'レストラン', 
    'cafe': 'カフェ',
    'beauty_salon': '美容',
    'museum': '博物館',
    'electronics_store': '電子機器'
  };
  
  const finalTags = tags.filter(tag => {
    if (duplicateMap[tag]) {
      return !tags.includes(duplicateMap[tag]);
    }
    return true;
  });
  
  // 5. 重複削除
  return [...new Set(finalTags)].join(',');
};



// 新規スポット作成関数
const handleAddNewSpot = async (candidate) => {
  if (!user) {
    alert('スポット追加にはログインが必要です');
    window.location.href = '/auth';
    return;
  }

  try {
    // Supabaseにスポット追加
    const { data, error } = await supabase
      .from('spots')
      .insert({
        name: candidate.name,
        location: candidate.location,
        lat: candidate.lat,
        lng: candidate.lng,
        image_url: candidate.image_url,
        description: `${candidate.name}は${candidate.location}にあるスポットです。`,
        tags: generateOptimizedTags(candidate),
        author_id: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // 新しいスポットを配列に追加
    setSpots(prev => [...prev, data]);
    setFilteredSpots(prev => [...prev, data]);
    
    // 検索結果から削除
    setSearchResults(prev => ({
      ...prev,
      newCandidates: prev.newCandidates.filter((_, index) => 
        candidate.name !== prev.newCandidates[index].name
      )
    }));

   // モーダル内で表示中のスポットを更新
    setSelectedSpot(data);
    
    // 自動的にマイマップに追加
    const { error: favError } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        spot_id: data.id
      });
    
    if (!favError) {
      setFavorites(prev => new Set([...prev, data.id]));
    }

  } catch (error) {
    console.error('スポット追加エラー:', error);
    console.error('エラー詳細:', JSON.stringify(error, null, 2));
    alert('スポットの追加に失敗しました: ' + (error.message || 'Unknown error'));
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
  <div 
    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
    onClick={() => {
      setSelectedSpot(spot);
      setShowSpotModal(true);
    }}
  >
                {/* 画像エリア - Pinterest風 */}
                <div className="relative overflow-hidden">
                  {spot.instagram_url ? (
                    <InstagramEmbed url={spot.instagram_url} />
                  ) : (
                    <ImageWithLoading 
  src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=600&fit=crop'}
  alt={spot.name}
  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
/>
                  )}
                  
                  {/* Pinterest風オーバーレイ */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-4 right-4 flex gap-2">
                      {/* ハートボタン - Pinterest風 */}
                      <button
  onClick={(e) => {
    e.stopPropagation();
    if (spot.id) {
      toggleFavorite(spot.id);
    } else {
      console.error('スポットIDが存在しません:', spot);
    }
  }}
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
  onClick={(e) => {
    e.stopPropagation();
    toggleFollow(author.id);
  }}
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
  onClick={(e) => e.stopPropagation()}
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
    <a href="/mymap" className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-colors">
  <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
    {profileImage ? (
      <img 
        src={profileImage} 
        alt="プロフィール画像" 
        className="w-full h-full object-cover"
      />
    ) : (
      <UserCircle size={12} className="text-white" />
    )}
  </div>
  <span className="text-sm font-medium">{user.email?.split('@')[0]}</span>
</a>
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
      <main className="max-w-7xl mx-auto pb-20">
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
            </div>
            
            {/* 検索結果表示 */}
{searchTerm && (
  <div className="mt-4">
    <div className="text-sm text-gray-600 mb-4">
      <span className="font-medium">{filteredSpots.length}件</span>のスポットが見つかりました
      {searchTerm && (
        <span className="ml-2">
          「<span className="font-medium text-blue-600">{searchTerm}</span>」の検索結果
        </span>
      )}
      {isSearching && (
        <span className="ml-2 text-blue-600">検索中...</span>
      )}
    </div>
    
   {/* 新規候補表示 */}
{searchResults.newCandidates.length > 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
    <h4 className="font-medium text-blue-900 mb-3">📍 候補スポット</h4>
    <div className="space-y-2" id="candidates-container">
      {searchResults.newCandidates.slice(0, visibleCandidatesCount).map((candidate, index) => (
        <div 
          key={index}
          className="bg-white p-4 rounded-lg border hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
          onClick={() => {
            setSelectedSpot(candidate);
            setShowSpotModal(true);
          }}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">🏪</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-medium text-gray-900 truncate">{candidate.name}</h5>
              <p className="text-sm text-gray-600 truncate">{candidate.location}</p>
            </div>
          </div>
          {candidate.isRegistered && (
            <div className="text-yellow-500 text-lg">★</div>
          )}
        </div>
      ))}
      
      {/* 読み込みインジケーター */}
{visibleCandidatesCount < searchResults.newCandidates.length && (
  <div className="flex justify-center pt-4" id="load-more-indicator">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
      <span>さらに読み込み中...</span>
    </div>
  </div>
)}
    </div>
  </div>
)}
    
    
    {/* 手動入力オプション */}
    {searchResults.showManualInput && (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-gray-900 mb-2">✏️ 見つからない場合</h4>
        <p className="text-sm text-gray-600 mb-3">
          お探しのスポットが見つかりませんでした。手動で追加しますか？
        </p>
        <button 
  onClick={() => window.location.href = '/admin'}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
>
  手動でスポット追加
</button>
      </div>
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
          ) : (
  <div ref={mapRef} className="w-full h-[60vh] md:h-[70vh] lg:h-[80vh] min-h-[500px] max-h-[90vh] rounded-lg mt-6 shadow-lg"></div>
          )}
        </div>
      </main>

     
      {/* スポット詳細モーダル */}
      <SpotDetailModal
        spot={selectedSpot}
        isOpen={showSpotModal}
        onClose={() => setShowSpotModal(false)}
        user={user}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        handleAddNewSpot={handleAddNewSpot}
      />
      {/* 下部ナビゲーション */}
<BottomNavigation user={user} />
    </div>
  );
}