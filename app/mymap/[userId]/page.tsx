'use client';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Share2, UserCircle, MapPin, Users, Star, UserPlus, UserMinus, Lock, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

// 静的生成を無効化（環境変数が必要なため）
export const dynamic = 'force-dynamic';

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

export default function PublicMyMapPage() {
  const params = useParams();
  const targetUserId = params.userId;
  
  const [currentUser, setCurrentUser] = useState(null);
  const [targetProfile, setTargetProfile] = useState(null);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const initializePage = async () => {
      await checkCurrentUser();
      await fetchTargetProfile();
    };
    
    initializePage();
  }, [targetUserId]);

  const checkCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user && targetUserId) {
        await checkFollowStatus(user.id, targetUserId);
      }
    } catch (error) {
      console.error('ユーザー確認エラー:', error);
    }
  };

  const fetchTargetProfile = async () => {
    try {
      setLoading(true);
      
      // ターゲットユーザーのプロフィール情報を取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (profileError) {
        console.error('プロフィール取得エラー:', profileError);
        setError('ユーザーが見つかりません');
        return;
      }

      if (!profile) {
        setError('ユーザーが見つかりません');
        return;
      }

      // 公開設定チェック
      if (profile.privacy_setting === 'private') {
        setError('このマイマップは非公開に設定されています');
        return;
      }

      setTargetProfile(profile);
      await fetchUserFavoriteSpots(targetUserId);
      
    } catch (error) {
      console.error('データ取得エラー:', error);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFavoriteSpots = async (userId) => {
    try {
      // お気に入りのspot_idを取得
      const { data: favData, error: favError } = await supabase
        .from('user_favorites')
        .select('spot_id')
        .eq('user_id', userId);

      if (favError) throw favError;

      if (favData && favData.length > 0) {
        const spotIds = favData.map(fav => fav.spot_id);

        // お気に入りのスポット情報を取得
        const { data: spotsData, error: spotsError } = await supabase
          .from('spots')
          .select('*')
          .in('id', spotIds);

        if (spotsError) throw spotsError;

        setFavoriteSpots(spotsData || []);
      } else {
        setFavoriteSpots([]);
      }
    } catch (error) {
      console.error('お気に入りスポットの取得に失敗:', error);
      setFavoriteSpots([]);
    }
  };

  const checkFollowStatus = async (followerId, followingId) => {
    try {
      // まずfollowingIdがprofilesテーブルに存在するかチェック
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', followingId)
        .single();

      if (!profileData) return;

      // フォロー状態をチェック
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', profileData.id)
        .single();

      setIsFollowing(!!followData);
    } catch (error) {
      console.error('フォロー状態確認エラー:', error);
    }
  };

  const toggleFollow = async () => {
    if (!currentUser || !targetProfile) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // アンフォロー
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetProfile.id);
        
        if (!error) {
          setIsFollowing(false);
        }
      } else {
        // フォロー
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: targetProfile.id
          });
        
        if (!error) {
          setIsFollowing(true);
        }
      }
    } catch (error) {
      console.error('フォロー操作エラー:', error);
    } finally {
      setFollowLoading(false);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
                <span>SpottMapに戻る</span>
              </a>
            </div>
          </div>
        </header>

        {/* エラー表示 */}
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="mb-8">
            {error === 'このマイマップは非公開に設定されています' ? (
              <Lock size={64} className="mx-auto text-gray-300 mb-4" />
            ) : (
              <AlertCircle size={64} className="mx-auto text-gray-300 mb-4" />
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{error}</h1>
            <p className="text-gray-600 mb-8">
              {error === 'このマイマップは非公開に設定されています' 
                ? 'このユーザーのマイマップは非公開に設定されているため、閲覧できません。'
                : '申し訳ございませんが、このページを表示できませんでした。'
              }
            </p>
          </div>
          
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={20} />
            SpottMapに戻る
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
              <h1 className="text-xl font-bold text-gray-900">
                {targetProfile?.display_name || targetProfile?.username || 'ユーザー'}のマイマップ
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {currentUser && currentUser.id !== targetUserId && (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isFollowing
                      ? 'bg-gray-500 hover:bg-gray-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
                  {followLoading ? '処理中...' : (isFollowing ? 'フォロー中' : 'フォロー')}
                </button>
              )}
              
              {!currentUser && (
                <a
                  href="/auth"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserCircle size={18} />
                  ログイン
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* プロフィール情報 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <UserCircle size={48} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {targetProfile?.display_name || targetProfile?.username || 'ユーザー'}
              </h1>
              {targetProfile?.instagram_username && (
                <p className="text-blue-100 mb-2">@{targetProfile.instagram_username}</p>
              )}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{favoriteSpots.length} お気に入りスポット</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={16} />
                  <span>
                    {targetProfile?.privacy_setting === 'public' ? '公開' : 
                     targetProfile?.privacy_setting === 'unlisted' ? '限定公開' : '非公開'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favoriteSpots.length === 0 ? (
          // 空の状態
          <div className="text-center py-16">
            <Heart size={64} className="mx-auto text-gray-300 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              まだお気に入りスポットがありません
            </h3>
            <p className="text-gray-600 mb-8">
              このユーザーはまだお気に入りスポットを追加していません
            </p>
          </div>
        ) : (
          // お気に入りスポットのグリッド表示
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">お気に入りスポット</h2>
              <p className="text-gray-600">
                {targetProfile?.display_name || targetProfile?.username}さんがお気に入りに追加したスポット一覧
              </p>
            </div>
            
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
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{spot.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{spot.location}</p>
                    <p className="text-gray-700 text-sm mb-3">{spot.description}</p>
                    
                    {spot.tags && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {spot.tags.split(',').map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
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
                            📸 Instagram
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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