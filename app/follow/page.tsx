'use client';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserCircle, MapPin, Heart, UserMinus } from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';
import Link from 'next/link';

// 静的生成を無効化（環境変数が必要なため）
export const dynamic = 'force-dynamic';

import supabase from '../lib/supabase';

export default function FollowsPage() {
  const [user, setUser] = useState(null);
  const [followedAuthors, setFollowedAuthors] = useState([]);
  const [authorStats, setAuthorStats] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchFollows();
  }, []);

  const checkAuthAndFetchFollows = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    
    setUser(user);
    await fetchFollowedAuthors(user.id);
  };

  const fetchFollowedAuthors = async (userId: string) => {
    try {
      // まずフォロー関係を取得
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) {
        console.error('Error fetching follows:', followError);
        setLoading(false);
        return;
      }

      if (followData && followData.length > 0) {
        // 次にprofiles情報を別途取得
        const authorIds = followData.map(f => f.following_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, display_name, instagram_username, type, created_at')
          .in('id', authorIds);
          
        if (profilesData) {
          setFollowedAuthors(profilesData);
          await fetchAuthorStats(profilesData);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthorStats = async (authors: any[]) => {
    const statsMap = new Map();
    
    for (const author of authors) {
      try {
        // 投稿者のスポット数を取得
        const { data: spotsData, error } = await supabase
          .from('spots')
          .select('id')
          .eq('author_id', author.id);
        
        if (!error && spotsData) {
          statsMap.set(author.id, {
            spotCount: spotsData.length
          });
        }
      } catch (error) {
        console.error('Error fetching author stats:', error);
      }
    }
    
    setAuthorStats(statsMap);
  };

  const handleUnfollow = async (authorId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', authorId);

      if (!error) {
        // フォロー一覧から削除
        setFollowedAuthors(prev => 
          prev.filter(author => author.id !== authorId)
        );
      }
    } catch (error) {
      console.error('Error unfollowing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">フォロー情報を読み込み中...</p>
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
              <Link 
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                戻る
              </Link>
              <h1 className="text-xl font-bold text-gray-900">フォロー中の投稿者</h1>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <UserCircle size={18} />
              <span>{user?.email?.split('@')[0]}</span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* 統計情報 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">フォロー中の投稿者</h2>
              <p className="text-blue-100">お気に入りの投稿者をフォローして最新情報をチェック</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{followedAuthors.length}</div>
              <div className="text-sm text-blue-100">フォロー中</div>
            </div>
          </div>
        </div>

        {/* フォロー一覧 */}
        {followedAuthors.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">まだ誰もフォローしていません</h3>
            <p className="text-gray-600 mb-6">
              気になる投稿者をフォローして、お気に入りのスポットを発見しましょう
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MapPin size={18} />
              スポットを探す
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {followedAuthors.map((author) => {
              const stats = authorStats.get(author.id) || { spotCount: 0 };
              
              return (
                <div key={author.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    {/* プロフィール情報 */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <UserCircle size={32} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">
                          {author.display_name || author.username}
                        </h3>
                        <p className="text-sm text-gray-500">
                          @{author.instagram_username}
                        </p>
                        <p className="text-xs text-gray-400">
                          フォロー開始: {formatDate(author.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* 統計情報 */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{stats.spotCount}</div>
                          <div className="text-sm text-gray-500">投稿スポット</div>
                        </div>
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex gap-2">
                      <Link
                        href={`/?author=${author.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <MapPin size={16} />
                        スポット一覧
                      </Link>
                      <button
                        onClick={() => handleUnfollow(author.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="フォロー解除"
                      >
                        <UserMinus size={16} />
                        解除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 下部ナビゲーション */}
      <BottomNavigation user={user} />
    </div>
  );
}