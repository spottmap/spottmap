'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapPin, Plus, Save, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  // 認証状態管理
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // フォーム状態管理
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    lat: '',
    lng: '',
    image_url: '',
    instagram_user: '',
    tags: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
      
      if (!user) {
        window.location.href = '/auth';
      }
    };
    
    checkAuth();
  }, []);

  // ローディング中
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">認証確認中...</div>
      </div>
    );
  }

  // 未認証
  if (!user) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 必須フィールドのチェック
      if (!formData.name || !formData.location || !formData.lat || !formData.lng) {
        throw new Error('必須フィールドを入力してください');
      }

      // 緯度経度の数値変換
      const lat = parseFloat(formData.lat);
      const lng = parseFloat(formData.lng);
      
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('緯度・経度は数値で入力してください');
      }

      // タグの配列変換（カンマ区切り）
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const spotData = {
        name: formData.name,
        location: formData.location,
        lat: lat,
        lng: lng,
        image_url: formData.image_url || null,
        instagram_user: formData.instagram_user || null,
        tags: tagsArray.length > 0 ? tagsArray.join(',') : null,
        description: formData.description || null
      };

      const { data, error } = await supabase
        .from('spots')
        .insert([spotData])
        .select();

      if (error) throw error;

      setMessage('スポットを正常に登録しました！');
      setMessageType('success');
      
      // フォームをリセット
      setFormData({
        name: '',
        location: '',
        lat: '',
        lng: '',
        image_url: '',
        instagram_user: '',
        tags: '',
        description: ''
      });

    } catch (error: any) {
      setMessage(error.message || 'エラーが発生しました');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <MapPin className="text-blue-600" />
            スポット管理画面
          </h1>
          <p className="text-gray-600">新しいローカルスポットを登録します</p>
          <p className="text-sm text-green-600 mt-2">ログイン済み: {user?.email}</p>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            messageType === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <AlertCircle size={20} />
            {message}
          </div>
        )}

        {/* 登録フォーム */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  スポット名 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="おしゃれカフェ Roastery"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住所・場所 *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="渋谷区神宮前"
                  required
                />
              </div>
            </div>

            {/* 位置情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  緯度 *
                </label>
                <input
                  type="number"
                  step="any"
                  name="lat"
                  value={formData.lat}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="35.6762"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  経度 *
                </label>
                <input
                  type="number"
                  step="any"
                  name="lng"
                  value={formData.lng}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="139.7043"
                  required
                />
              </div>
            </div>

            {/* Instagram情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  画像URL
                </label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram投稿者
                </label>
                <input
                  type="text"
                  name="instagram_user"
                  value={formData.instagram_user}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="@tokyocafe_lover"
                />
              </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#カフェ, #コーヒー, #渋谷"
              />
              <p className="text-xs text-gray-500 mt-1">カンマ区切りで入力してください</p>
            </div>

            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="こだわりの自家焙煎コーヒーが楽しめる隠れ家カフェ"
              />
            </div>

            {/* 送信ボタン */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>処理中...</>
                ) : (
                  <>
                    <Save size={20} />
                    スポットを登録
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}