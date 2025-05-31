'use client';
import React, { useState } from 'react';
import { Grid, Map, Heart, Share2, User } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Loader } from '@googlemaps/js-api-loader';

// Google Maps API の型定義
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
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
  
  const testSupabaseConnection = async () => {
    const { data, error } = await supabase.from('test').select('*')
    console.log('Supabase接続テスト:', { data, error })
  }

  // サンプルデータ
  const spots = [
    {
      id: 1,
      name: "おしゃれカフェ Roastery",
      location: "渋谷区神宮前",
      lat: 35.6762,
      lng: 139.7043,
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
      instagramUser: "@tokyocafe_lover",
      tags: ["#カフェ", "#コーヒー", "#渋谷"],
      description: "こだわりの自家焙煎コーヒーが楽しめる隠れ家カフェ"
    },
    {
      id: 2,
      name: "アートギャラリー MUSE",
      location: "港区六本木",
      lat: 35.6627,
      lng: 139.7320,
      image: "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400&h=300&fit=crop",
      instagramUser: "@art_tokyo",
      tags: ["#アート", "#ギャラリー", "#六本木"],
      description: "現代アート作品を展示する小さなギャラリー"
    },
    {
      id: 3,
      name: "古本屋 文庫の森",
      location: "新宿区神楽坂",
      lat: 35.7022,
      lng: 139.7394,
      image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
      instagramUser: "@book_hunter",
      tags: ["#古本", "#本屋", "#神楽坂"],
      description: "レアな古本と雰囲気の良い老舗古書店"
    },
    {
      id: 4,
      name: "ヴィンテージショップ Retro",
      location: "世田谷区下北沢",
      lat: 35.6617,
      lng: 139.6681,
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
      instagramUser: "@vintage_shimokita",
      tags: ["#ヴィンテージ", "#古着", "#下北沢"],
      description: "厳選されたヴィンテージ服が見つかるお店"
    }
  ];

  // ユーザー一覧を取得
  const users = [...new Set(spots.map(spot => spot.instagramUser))];
  
  // フィルタリングされたスポット
  const filteredSpots = selectedUser === 'all' 
    ? spots 
    : spots.filter(spot => spot.instagramUser === selectedUser);

  // 地図表示用のコンポーネント
  const MapView = () => {
    const mapRef = React.useRef(null);

    React.useEffect(() => {
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
    }, [filteredSpots]);

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
  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {filteredSpots.map((spot) => (
        <div key={spot.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <img 
            src={spot.image} 
            alt={spot.name}
            className="w-full h-48 object-cover"
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
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Supabase接続テストボタン */}
      <button 
        onClick={testSupabaseConnection}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Supabase接続テスト
      </button>
      
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          ローカルスポット探索
        </h1>
        <p className="text-gray-600">感度の高いスポットを地図で発見しよう</p>
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
        <p>プロトタイプ版 - Instagram連携とGoogle Maps APIは実装予定</p>
      </div>
    </div>
  );
}