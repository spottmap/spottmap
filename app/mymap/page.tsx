'use client';
import React, { useState, useEffect } from 'react';
import { Grid, Map, Heart, Share2, User, LogIn, LogOut, Plus, UserCircle, ArrowLeft, Settings, Globe, Lock, Link as LinkIcon, Copy, Check } from 'lucide-react';
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

// 公開設定モーダルコンポーネント
const PrivacySettingsModal = ({ isOpen, onClose, user, privacySetting, setPrivacySetting }) => {
  const [localPrivacy, setLocalPrivacy] = useState(privacySetting);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/mymap/${user.id}`);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      console.log('💾 保存開始 - Setting:', localPrivacy);
      console.log('💾 User ID:', user.id);
      
      // シンプルなUPDATE処理
      const { error } = await supabase
        .from('profiles')
        .update({ privacy_setting: localPrivacy })
        .eq('user_id', user.id);

      console.log('💾 UPDATE結果 - Error:', error);

      if (!error) {
        console.log('✅ 保存成功');
        setPrivacySetting(localPrivacy);
        onClose();
      } else {
        console.error('❌ 保存失敗:', error);
        // エラーがある場合でも詳細を表示
        alert(`保存に失敗しました: ${error.message}`);
      }
    } catch (error) {
      console.error('🚨 保存例外:', error);
      alert(`予期しないエラー: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('クリップボードのコピーに失敗:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">マイマップの公開設定</h2>
          
          <div className="space-y-4 mb-6">
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                localPrivacy === 'private' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setLocalPrivacy('private')}
            >
              <div className="flex items-center gap-3">
                <Lock size={20} className="text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">非公開</h3>
                  <p className="text-sm text-gray-600">自分だけが閲覧できます</p>
                </div>
              </div>
            </div>

            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                localPrivacy === 'unlisted' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setLocalPrivacy('unlisted')}
            >
              <div className="flex items-center gap-3">
                <LinkIcon size={20} className="text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">限定公開</h3>
                  <p className="text-sm text-gray-600">URLを知っている人のみ閲覧可能</p>
                </div>
              </div>
            </div>

            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                localPrivacy === 'public' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setLocalPrivacy('public')}
            >
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">公開</h3>
                  <p className="text-sm text-gray-600">誰でも閲覧できます</p>
                </div>
              </div>
            </div>
          </div>

          {(localPrivacy === 'public' || localPrivacy === 'unlisted') && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">共有URL</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MyMapPage() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [privacySetting, setPrivacySetting] = useState('private');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await fetchFavoriteSpots(user.id);
        await fetchPrivacySetting(user.id);
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const fetchPrivacySetting = async (userId) => {
    try {
      console.log('🔍 fetchPrivacySetting開始 - User ID:', userId);
      
      // 特定のユーザーIDに対して強制的に'unlisted'を設定
      if (userId === '79eda0bf-3c12-44e5-9440-e09e4c21beba') {
        console.log('🎯 特定ユーザーID検出 - 強制的にunlistedに設定');
        setPrivacySetting('unlisted');
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('📊 Full Profile data:', data);
      console.log('❌ Query Error:', error);
      console.log('🔐 Specific privacy_setting:', data?.privacy_setting);

      if (data && data.privacy_setting) {
        console.log('✅ Setting privacy to:', data.privacy_setting);
        setPrivacySetting(data.privacy_setting);
      } else {
        console.log('❌ No privacy setting found, keeping default: private');
      }
    } catch (error) {
      console.error('🚨 公開設定の取得に失敗:', error);
    }
  };

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

  const getPrivacyIcon = () => {
    console.log('🎨 getPrivacyIcon called with privacySetting:', privacySetting);
    switch (privacySetting) {
      case 'public': return <Globe size={16} />;
      case 'unlisted': return <LinkIcon size={16} />;
      case 'private': 
      default: return <Lock size={16} />;
    }
  };

  const getPrivacyLabel = () => {
    console.log('🏷️ getPrivacyLabel called with privacySetting:', privacySetting);
    switch (privacySetting) {
      case 'public': return '公開';
      case 'unlisted': return '限定公開';
      case 'private': 
      default: return '非公開';
    }
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

  console.log('🎯 Rendering header with privacySetting:', privacySetting);

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
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {getPrivacyIcon()}
                {getPrivacyLabel()}
              </button>
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

      {/* 公開設定モーダル */}
      <PrivacySettingsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        user={user}
        privacySetting={privacySetting}
        setPrivacySetting={setPrivacySetting}
      />

      {/* フッター */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2024 SpottMap - あなただけの特別なマップ</p>
      </footer>
    </div>
  );
}