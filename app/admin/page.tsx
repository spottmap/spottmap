'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Save, AlertCircle } from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';

// 静的生成を無効化（環境変数が必要なため）
export const dynamic = 'force-dynamic';

import supabase from '../lib/supabase';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // フォーム状態管理
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    lat: '',
    lng: '',
    image_url: '',
    instagram_url: '', // Instagram URL専用フィールド追加
    instagram_user: '',
    tags: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('認証チェックエラー:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Instagram URLから投稿者名を抽出する関数
      const extractInstagramUser = (url) => {
        if (!url) return '';
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/');
          if (pathParts.length >= 2 && pathParts[1]) {
            return pathParts[1];
          }
        } catch (error) {
          console.error('Instagram URL解析エラー:', error);
        }
        return formData.instagram_user || '';
      };

      const spotData = {
        name: formData.name,
        location: formData.location,
        lat: parseFloat(formData.lat) || null,
        lng: parseFloat(formData.lng) || null,
        image_url: formData.image_url,
        instagram_url: formData.instagram_url,
        instagram_user: extractInstagramUser(formData.instagram_url) || formData.instagram_user,
        tags: formData.tags,
        description: formData.description,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('spots')
        .insert([spotData]);

      if (error) throw error;

      setMessage('スポットが正常に登録されました！');
      setFormData({
        name: '',
        location: '',
        lat: '',
        lng: '',
        image_url: '',
        instagram_url: '',
        instagram_user: '',
        tags: '',
        description: ''
      });

    } catch (error) {
      console.error('登録エラー:', error);
      setMessage(`エラーが発生しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">認証確認中...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">管理画面</h1>
            <p className="text-gray-600">この機能を利用するにはログインが必要です</p>
          </div>
          
          <div className="space-y-4">
            <a
              href="/auth"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ログイン画面へ
            </a>
            <a
              href="/"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              SpottMapに戻る
            </a>
          </div>
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
              <a href="/" className="text-xl font-bold text-blue-600">SpottMap</a>
              <span className="text-gray-400">|</span>
              <h1 className="text-lg font-semibold text-gray-900">管理画面</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto pb-20">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Plus size={24} />
              新しいスポットを登録
            </h2>
            <p className="text-gray-600 mt-2">Instagram投稿から魅力的なローカルスポットを追加しましょう</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  スポット名 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: おしゃれカフェ Roastery"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  場所・住所 *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 渋谷区神南1-2-3"
                />
              </div>
            </div>

            {/* 座標 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  緯度 (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  name="lat"
                  value={formData.lat}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 35.6804"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  経度 (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  name="lng"
                  value={formData.lng}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 139.7690"
                />
              </div>
            </div>

            {/* Instagram情報 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram投稿URL
                </label>
                <input
                  type="url"
                  name="instagram_url"
                  value={formData.instagram_url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: https://www.instagram.com/p/ABC123/"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Instagram投稿のURLを入力すると、投稿者名が自動で設定されます
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  投稿者(@ユーザー名)
                </label>
                <input
                  type="text"
                  name="instagram_user"
                  value={formData.instagram_user}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: tokyocafe_lover"
                />
              </div>
            </div>

            {/* 画像URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                画像URL
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: https://example.com/image.jpg"
              />
            </div>

            {/* タグ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: #カフェ, #コーヒー, #渋谷"
              />
              <p className="text-sm text-gray-500 mt-1">
                カンマ区切りで複数のタグを入力してください
              </p>
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明・コメント
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="スポットの魅力や特徴について説明してください..."
              />
            </div>

            {/* 送信ボタン */}
            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={20} />
                {loading ? '登録中...' : 'スポットを登録'}
              </button>
              
              <a
                href="/"
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </a>
            </div>

            {/* メッセージ表示 */}
            {message && (
  <div className={`p-4 rounded-lg ${
    message.includes('エラー') 
      ? 'bg-red-50 text-red-800 border border-red-200' 
      : 'bg-green-50 text-green-800 border border-green-200'
  }`}>
    {message}
  </div>
)}
          </form>
        </div>
      </main>

      {/* 下部ナビゲーション */}
      <BottomNavigation user={user} />
    </div>
  );
}