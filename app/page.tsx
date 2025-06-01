'use client';
import React, { useState, useEffect } from 'react';
import { Grid, Map, Heart, Share2, User, LogIn, LogOut, Plus, UserCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Loader } from '@googlemaps/js-api-loader';

// Google Maps API の型定義
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (...args: any[]) => any;
        Marker: new (...args: any[]) => any;
      };
    };
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'grid'
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [selectedUser, setSelectedUser] = useState('all'); // フィルター用
  const [spots, setSpots] = useState([]); // Supabaseから読み込むデータ
  const [loading, setLoading] = useState(true);
  
  // 認証状態管理
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // 認証状態をチェック
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };
    checkAuth();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // ログアウト機能
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
    }
  };

  // Instagram埋め込みコンポーネント
  const InstagramEmbed = ({ url, fallbackImage, spotName }) => {
    const [showEmbed, setShowEmbed] = useState(false);
    const [embedError, setEmbedError] = useState(false);

    // InstagramのURLからpostのIDを取得
    const getInstagramPostId = (url) => {
      if (!url) return null;
      const match = url.match(/\/p\/([^\/\?]+)/);
      return match ? match[1] : null;
    };

    const postId = getInstagramPostId(url);

    useEffect(() => {
      if (showEmbed && postId) {
        // Instagram埋め込みスクリプトを動的に読み込み
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

    // URLが無効またはInstagram URLでない場合はフォールバック画像
    if (!url || !postId) {
      return (
        <img 
          src={fallbackImage} 
          alt={spotName}
          className="w-full h-48 object-cover"
        />
      );
    }

    // エラーが発生した場合もフォールバック画像
    if (embedError) {
      return (
        <img 
          src={fallbackImage} 
          alt={spotName}
          className="w-full h-48 object-cover"
        />
      );
    }

    // 最初はフォールバック画像を表示し、クリックでInstagram埋め込みを表示
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

    // Instagram埋め込み表示
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

  // Supabaseからスポットデータを取得
  const fetchSpots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // データを適切な形式に変換
      const formattedSpots = data.map(spot => ({
        id: spot.id,
        name: spot.name,
        location: spot.location,
        lat: spot.lat,
        lng: spot.lng,
        image: spot.image_url || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
        instagramUser: spot.instagram_user || "@unknown",
        instagramUrl: spot.instagram_url || null, // Instagram URL追加
        tags: spot.tags ? spot.tags.split(',').map(tag => tag.trim()) : [],
        description: spot.description || ""
      }));

      setSpots(formattedSpots);
    } catch (error) {
      console.error('スポットデータの取得に失敗:', error);
      // エラー時はサンプルデータを表示
      setSpots([
        {
          id: 1,
          name: "おしゃれカフェ Roastery",
          location: "渋谷区神宮前",
          lat: 35.6762,
          lng: 139.7043,
          image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
          instagramUser: "@tokyocafe_lover",
          instagramUrl: null,
          tags: ["#カフェ", "#コーヒー", "#渋谷"],
          description: "こだわりの自家焙煎コーヒーが楽しめる隠れ家カフェ"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // コンポーネント読み込み時にデータを取得
  useEffect(() => {
    fetchSpots();
  }, []);

  const testSupabaseConnection = async () => {
    const { data, error } = await supabase.from('spots').select('*');
    console.log('Supabase接続テスト:', { data, error });
  }

  // ユーザー一覧を取得
  const users = [...new Set(spots.map(spot => spot.instagramUser))];
  
  // フィルタリングされたスポット
  const filteredSpots = selectedUser === 'all' 
    ? spots 
    : spots.filter(spot => spot.instagramUser === selectedUser);

  // ナビゲーションコンポーネント
  const Navigation = () => (
    <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          ローカルスポット探索
        </h1>
        <p className="text-gray-600">感度の高いスポットを地図で発見しよう</p>
      </div>
      
      <div className="flex items-center gap-3">
        {!authLoading && (
          <>
            {user ? (
              // ログイン済みの場合
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <UserCircle size={20} className="text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {user.email?.split('@')[0]}
                  </span>
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
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <LogOut size={18} />
                  ログアウト
                </button>
              </div>
            ) : (
              // 未ログインの場合
              <a
                href="/auth"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogIn size={18} />
                ログイン
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );

  // 地図表示用のコンポーネント
  const MapView = () => {
    const mapRef = React.useRef(null);

    React.useEffect(() => {
      if (loading || spots.length === 0) return;

      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: "weekly",
      });

      loader.load().then(() => {
        if (mapRef.current) {
          const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 }, // 東京
            zoom: 12,
          });

          // スポットにピンを追加
          filteredSpots.forEach((spot) => {
            const marker = new window.google.maps.Marker({
              position: { lat: spot.lat, lng: spot.lng },
              map: map,
              title: spot.name,
            });
            
            marker.addListener('click', () => {
              setSelectedSpot(spot);
            });
          });
        }
      });
    }, [filteredSpots, loading]);

    if (loading) {
      return (
        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">地図を読み込み中...</p>
        </div>
      );
    }

    return (
      <div className="relative">
        <div ref={mapRef} className="w-full h-96 bg-gray-100 rounded-lg" />
        
        {/* 選択されたスポットの詳細 */}
        {selectedSpot && (
          <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg">
            <div className="flex items-start gap-3">
              <img 
                src={selectedSpot.image} 
                alt={selectedSpot.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-bold text-lg">{selectedSpot.name}</h3>
                <p className="text-gray-600 text-sm">{selectedSpot.location}</p>
                <p className="text-blue-600 text-sm">{selectedSpot.instagramUser}</p>
                {selectedSpot.instagramUrl && (
                  <a 
                    href={selectedSpot.instagramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-pink-500 text-xs hover:underline"
                  >
                    📸 Instagram投稿を見る
                  </a>
                )}
              </div>
              <button 
                onClick={() => setSelectedSpot(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // グリッド表示用のコンポーネント
  const GridView = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">スポット情報を読み込み中...</p>
        </div>
      );
    }

    if (filteredSpots.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">スポットが見つかりませんでした</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSpots.map((spot) => (
          <div key={spot.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Instagram埋め込みまたはフォールバック画像 */}
            <InstagramEmbed 
              url={spot.instagramUrl}
              fallbackImage={spot.image}
              spotName={spot.name}
            />
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg">{spot.name}</h3>
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-red-500">
                    <Heart size={20} />
                  </button>
                  <button className="text-gray-400 hover:text-blue-500">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">{spot.location}</p>
              <p className="text-gray-700 text-sm mb-3">{spot.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-blue-600 text-sm">
                  <User size={14} />
                  {spot.instagramUser}
                </div>
                <div className="flex gap-1">
                  {spot.tags.map((tag, index) => (
                    <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Instagram投稿リンク */}
              {spot.instagramUrl && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <a 
                    href={spot.instagramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-pink-500 text-sm hover:underline"
                  >
                    📸 Instagram投稿を見る
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* ナビゲーション */}
      <Navigation />

      {/* デバッグボタン（開発時のみ） */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={testSupabaseConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Supabase接続テスト
        </button>
        
        <button 
          onClick={fetchSpots}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
        >
          {loading ? '読み込み中...' : 'データ更新'}
        </button>
      </div>

      {/* 表示切替ボタン */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'map' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Map size={20} />
            地図表示
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Grid size={20} />
            カード表示
          </button>
        </div>
        
        {/* ユーザーフィルター */}
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">投稿者:</span>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            {users.map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
          {selectedUser !== 'all' && (
            <button
              onClick={() => setSelectedUser('all')}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        {viewMode === 'map' ? <MapView /> : <GridView />}
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{filteredSpots.length}</div>
          <div className="text-gray-600 text-sm">
            {selectedUser === 'all' ? '登録スポット' : 'フィルター結果'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg text-center shadow-sm">
          <div className="text-2xl font-bold text-green-600">{users.length}</div>
          <div className="text-gray-600 text-sm">投稿者</div>
        </div>
        <div className="bg-white p-4 rounded-lg text-center shadow-sm">
          <div className="text-2xl font-bold text-purple-600">12</div>
          <div className="text-gray-600 text-sm">フォロワー</div>
        </div>
      </div>

      {/* フッター */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>プロトタイプ版 - Instagram連携実装済み</p>
      </div>
    </div>
  );
}