'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MapPin, ArrowLeft, Plus } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SharePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [spotData, setSpotData] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
    processSharedUrl();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const processSharedUrl = async () => {
  const url = searchParams.get('url');
  const title = searchParams.get('title');
  const text = searchParams.get('text');

  if (!url) {
    setError('共有URLが見つかりません');
    setIsProcessing(false);
    return;
  }

  try {
    if (url.includes('instagram.com')) {
  // Instagram URLの場合、投稿 or プロフィール判定
  if (url.includes('/p/')) {
    // 投稿URL → 従来処理
    const spotName = title || extractSpotNameFromText(text || '');
    const placesResults = await searchPlacesAPI(spotName);
    
    setSpotData({
      originalData: { url, title, text },
      searchResults: placesResults,
      spotName: spotName,
      mode: 'candidate_selection'
    });
  } else {
    // プロフィールURL → 新しい処理
    const profileResult = await processInstagramProfile(url, title, text);
    
    setSpotData({
      originalData: { url, title, text },
      searchResults: profileResult.candidates,
      spotName: profileResult.searchQuery,
      bioUsed: profileResult.bioUsed,
      bioAnalysis: profileResult.bioAnalysis,
      mode: 'candidate_selection'
    });
  }
} else if (url.includes('maps.google.com') || url.includes('goo.gl/maps')) {
      const extractedData = await extractGoogleMapsData(url, title, text);
      setSpotData(extractedData);
    } else {
      throw new Error('サポートされていないURLです');
    }
  } catch (error) {
    console.error('URL処理エラー:', error);
    setError('URLの処理に失敗しました');
  } finally {
    setIsProcessing(false);
  }
};

  const extractGoogleMapsData = async (url, title, text) => {
    return {
      name: title || 'Google Mapsのスポット',
      description: text || '',
      google_maps_url: url,
      image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
      source: 'google_maps'
    };
  };
  // テキストから店名を抽出
const extractSpotNameFromText = (text) => {
  // 簡単な抽出ロジック（後で改善可能）
  return text.split(/[#@\n]/)[0].trim() || 'スポット';
};

// Bio が店舗情報かどうか自動判定
const isBusinessBio = (bio) => {
  const businessSignals = {
    address: /東京都|大阪府|〒\d{3}-\d{4}|区|市/.test(bio),
    phone: /\d{2,4}-\d{2,4}-\d{4}/.test(bio), 
    hours: /\d{1,2}:\d{2}[-~]\d{1,2}:\d{2}/.test(bio),
    businessEmoji: /[☕️🍰🍕🍜🛍️💄🏪🏬]/.test(bio),
    website: /https?:\/\//.test(bio),
    businessKeywords: /(店|カフェ|レストラン|ショップ|サロン|美容|整体)/.test(bio)
  };
  
  const signalCount = Object.values(businessSignals)
    .filter(Boolean).length;
  
  return {
    isBusiness: signalCount >= 2, // 2個以上で店舗判定
    confidence: signalCount / Object.keys(businessSignals).length,
    signals: businessSignals,
    locationHint: bio.match(/(渋谷|新宿|表参道|六本木|銀座|原宿|恵比寿|代官山|中目黒|池袋)/)?.[0]
  };
};

// プロフィール共有の処理
const processInstagramProfile = async (url, title, text) => {
  // 表示名抽出（@より前の部分）
  const displayName = title.split('(@')[0].trim();
  
  // Bio分析
  const bioAnalysis = isBusinessBio(text);
  
  // 検索クエリ決定
  let searchQuery = displayName;
  
  if (bioAnalysis.isBusiness && bioAnalysis.locationHint) {
    // 店舗情報あり → 位置情報活用
    searchQuery = `${displayName} ${bioAnalysis.locationHint}`;
    console.log('店舗Bio検出 → 位置情報活用:', searchQuery);
  } else {
    // 個人アカウントまたは情報不足 → 表示名のみ
    console.log('表示名のみ使用:', searchQuery);
  }
  
  // Google Places検索
  const candidates = await searchPlacesAPI(searchQuery);
  
  // フォールバック: Bio使用時に結果が少ない場合
  if (bioAnalysis.isBusiness && bioAnalysis.locationHint && candidates.length === 0) {
    console.log('フォールバック: 表示名のみで再検索');
    const fallbackCandidates = await searchPlacesAPI(displayName);
    return {
      searchQuery: displayName,
      candidates: fallbackCandidates,
      bioUsed: false,
      bioAnalysis
    };
  }
  
  return {
    searchQuery,
    candidates,
    bioUsed: bioAnalysis.isBusiness && bioAnalysis.locationHint,
    bioAnalysis
  };
};

// Google Places API検索（メインページと同じ）
const searchPlacesAPI = async (query) => {
  try {
    const response = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        location: '35.6762,139.6503',
        radius: 5000
      }),
    });
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Places API検索エラー:', error);
    return [];
  }
};

// 候補選択処理
const selectCandidate = async (candidate) => {
  setIsProcessing(true);
  
  try {
    // 重複チェック
    const existingSpot = await checkDuplicateSpot(candidate);
    
    if (existingSpot) {
      // 既存スポット → マイマップ追加確認
      setSpotData({
        ...existingSpot,
        mode: 'add_to_favorites',
        isExisting: true,
        instagram_url: spotData.originalData.url
      });
    } else {
      // 新規スポット → 作成+マイマップ追加確認
      setSpotData({
  ...candidate,
  instagram_url: spotData.originalData.url,
  description: candidate.description || `${candidate.category}`,
  mode: 'create_and_add',
  isExisting: false
});
    }
  } catch (error) {
    console.error('候補選択エラー:', error);
    setError('候補の選択に失敗しました');
  } finally {
    setIsProcessing(false);
  }
};

// 重複チェック
const checkDuplicateSpot = async (candidate) => {
  if (!user) return null;
  
  try {
    const { data: existingSpots } = await supabase
      .from('spots')
      .select('*')
      .gte('lat', candidate.lat - 0.001) // 約100m範囲
      .lte('lat', candidate.lat + 0.001)
      .gte('lng', candidate.lng - 0.001)
      .lte('lng', candidate.lng + 0.001);
    
    return existingSpots[0] || null;
  } catch (error) {
    console.error('重複チェックエラー:', error);
    return null;
  }
};

// 手動入力モード
const createManualSpot = () => {
  setSpotData({
    name: spotData.originalData.title || 'Instagram投稿のスポット',
    description: spotData.originalData.text || '',
    instagram_url: spotData.originalData.url,
    image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
    lat: 35.6762,
    lng: 139.6503,
    location: '位置情報を設定してください',
    mode: 'create_and_add',
    isExisting: false,
    source: 'instagram_manual'
  });
};

  const addSpotToMap = async () => {
  if (!user) {
    router.push('/auth');
    return;
  }

  if (!spotData) return;

  try {
    if (spotData.mode === 'add_to_favorites' && spotData.isExisting) {
      // 既存スポット → お気に入り追加のみ
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          spot_id: spotData.id
        });

      if (error) throw error;
      alert('マイマップに追加しました！');
    } else {
      // 新規スポット → 作成 + お気に入り追加
      const { data: newSpot, error: spotError } = await supabase
        .from('spots')
        .insert({
          name: spotData.name,
          description: spotData.description,
          image_url: spotData.image_url,
          instagram_url: spotData.instagram_url,
          tags: `共有,${spotData.source || 'instagram'}`,
          author_id: user.id,
          lat: spotData.lat || 35.6762,
          lng: spotData.lng || 139.6503,
          location: spotData.location || '位置情報を設定してください'
        })
        .select()
        .single();

      if (spotError) throw spotError;

      // 作成したスポットをお気に入りに追加
      const { error: favError } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          spot_id: newSpot.id
        });

      if (favError) throw favError;
      alert('マイマップに追加しました！');
    }
    
    router.push('/');
  } catch (error) {
    console.error('追加エラー:', error);
    alert('マイマップへの追加に失敗しました');
  }
};

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">共有内容を処理中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MapPin size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                スポット追加
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
  {/* 候補選択画面 */}
  {spotData && spotData.mode === 'candidate_selection' && (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
  「{spotData.spotName}」の検索結果
</h2>
<p className="text-gray-600 mb-6">
  追加するスポットを選択してください
</p>
      </div>

      {/* 候補一覧 */}
      {spotData.searchResults.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">📍 候補スポット</h4>
          <div className="space-y-3">
            {spotData.searchResults.map((candidate, index) => (
              <div 
                key={index}
                className="bg-white p-3 rounded-lg border hover:shadow-md transition-all cursor-pointer"
                onClick={() => selectCandidate(candidate)}
              >
                <div className="flex items-start gap-3">
                  <img 
                    src={candidate.image_url}
                    alt={candidate.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-900 truncate">{candidate.name}</h5>
                    <p className="text-sm text-gray-600 truncate">{candidate.location}</p>
                    {candidate.rating && (
                      <p className="text-xs text-yellow-600">⭐ {candidate.rating}</p>
                    )}
                  </div>
                  <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                    選択
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* 手動入力オプション */}
          <div className="mt-4 pt-3 border-t border-blue-200">
            <button 
              onClick={() => createManualSpot()}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              ✏️ 手動で情報を入力する
            </button>
          </div>
        </div>
      )}

      {/* 候補が見つからない場合 */}
      {spotData.searchResults.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">見つかりませんでした</h4>
          <p className="text-sm text-gray-600 mb-3">
            「{spotData.spotName}」に一致するスポットが見つかりませんでした
          </p>
          <button 
            onClick={() => createManualSpot()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            手動でスポット追加
          </button>
        </div>
      )}
    </div>
  )}

  {/* 最終確認画面 */}
  {spotData && (spotData.mode === 'add_to_favorites' || spotData.mode === 'create_and_add') && (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <img
        src={spotData.image_url}
        alt={spotData.name}
        className="w-full h-64 object-cover"
      />

      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{spotData.name}</h2>
        
        {spotData.description && (
          <p className="text-gray-700 mb-6">{spotData.description}</p>
        )}

        <div className="flex items-center gap-2 mb-6">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            📍 {spotData.location || '位置情報あり'}
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
            📸 Instagram
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={addSpotToMap}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            マイマップに追加
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
        </div>

        {!user && (
          <p className="text-sm text-gray-500 mt-4 text-center">
            マイマップに追加するにはログインが必要です
          </p>
        )}
      </div>
    </div>
  )}
</main>
    </div>
  );
}

// 新しく追加：Suspenseでラップした関数
function SharePageWithSuspense() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SharePage />
    </Suspense>
  );
}

export default SharePageWithSuspense;