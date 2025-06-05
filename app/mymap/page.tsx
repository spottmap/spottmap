'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Grid, MapIcon, Heart, Share2, User, LogIn, LogOut, Plus, UserCircle, ArrowLeft, Settings, Globe, Lock, Link as LinkIcon, Copy, Check, Coffee, Palette, X, MoreVertical } from 'lucide-react';
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
        className="w-full h-32 object-cover"
      />
    );
  }

  if (embedError) {
    return (
      <img 
        src={fallbackImage} 
        alt={spotName}
        className="w-full h-32 object-cover"
      />
    );
  }

  if (!showEmbed) {
    return (
      <div className="relative">
        <img 
          src={fallbackImage} 
          alt={spotName}
          className="w-full h-32 object-cover cursor-pointer"
          onClick={() => setShowEmbed(true)}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
             onClick={() => setShowEmbed(true)}>
          <div className="bg-white px-2 py-1 rounded text-xs font-medium">
            📸 表示
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-32 overflow-hidden">
      <blockquote 
        className="instagram-media" 
        data-instgrm-captioned 
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          maxWidth: '100%',
          minWidth: '240px',
          width: '100%',
          height: '100%'
        }}
        onError={() => setEmbedError(true)}
      >
        <div style={{ padding: '8px' }}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Instagram投稿を見る
          </a>
        </div>
      </blockquote>
    </div>
  );
};
// 新規カテゴリ作成モーダルコンポーネント
// 新規カテゴリ作成モーダルコンポーネント（2ステップ版）
const CategoryCreateModal = ({ isOpen, onClose, user, onCategoryCreated, favoriteSpots }) => {
  const [step, setStep] = useState(1); // 1: 名前入力, 2: スポット選択
  const [categoryName, setCategoryName] = useState('');
  const [selectedSpots, setSelectedSpots] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const handleNext = () => {
    if (!categoryName.trim()) return;
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSpotToggle = (spotId) => {
    setSelectedSpots(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(spotId)) {
        newSelection.delete(spotId);
      } else {
        newSelection.add(spotId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedSpots.size === favoriteSpots.length) {
      setSelectedSpots(new Set()); // 全解除
    } else {
      setSelectedSpots(new Set(favoriteSpots.map(spot => spot.id))); // 全選択
    }
  };

  const handleComplete = async () => {
    if (!user || !categoryName.trim()) return;

    setSaving(true);
    try {
      // 1. カテゴリ作成
      const { data: categoryData, error: categoryError } = await supabase
        .from('map_categories')
        .insert({
          user_id: user.id,
          name: categoryName.trim(),
          color: '#6B7280'
        })
        .select()
        .single();

      if (categoryError) throw categoryError;

      // 2. 選択されたスポットをカテゴリに追加
      if (selectedSpots.size > 0) {
        const spotCategoryInserts = Array.from(selectedSpots).map(spotId => ({
          spot_id: spotId,
          category_id: categoryData.id
        }));

        const { error: spotCategoryError } = await supabase
          .from('spot_categories')
          .insert(spotCategoryInserts);

        if (spotCategoryError) throw spotCategoryError;
      }

      // 3. 成功処理
      onCategoryCreated();
      handleClose();
    } catch (error) {
      alert(`カテゴリの作成に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCategoryName('');
    setSelectedSpots(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-[95vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        
        {step === 1 ? (
  // ステップ1: カテゴリ名入力
  <div className="p-6">
  {/* 右上×ボタン追加 */}
  <button
    onClick={handleClose}
    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
  >
    <X size={20} />
  </button>

  <h2 className="text-xl font-bold text-gray-900 mb-4">新規マイマップ作成</h2>

<div className="mb-6">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    マイマップ名
  </label>
  <input
    type="text"
    value={categoryName}
    onChange={(e) => setCategoryName(e.target.value)}
    placeholder="例: お気に入りカフェ"
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    maxLength={50}
  />
  <p className="text-xs text-gray-500 mt-1">{categoryName.length}/50文字</p>
</div>

<div className="flex justify-end">
    <button
      onClick={handleNext}
      disabled={!categoryName.trim()}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      次へ
    </button>
  </div>
</div>
        ) : (
          // ステップ2: スポット選択
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-200">
  {/* 右上×ボタン追加 */}
  <button
    onClick={handleClose}
    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
  >
    <X size={20} />
  </button>

  <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={20} />
                  戻る
                </button>
                <h2 className="text-xl font-bold text-gray-900">保存済みから追加</h2>
              </div>
              
              <div className="flex items-center justify-between">
  <p className="text-gray-600">
    「{categoryName}」に追加するスポットを選択してください
    <span className="ml-2 text-blue-600 font-medium">
      {selectedSpots.size}件選択中
    </span>
  </p>
  <button
    onClick={handleSelectAll}
    className="text-sm text-blue-600 hover:text-blue-700"
  >
    {selectedSpots.size === favoriteSpots.length ? '全解除' : '全選択'}
  </button>
</div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {favoriteSpots.map((spot) => (
                  <div
                    key={spot.id}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedSpots.has(spot.id) 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSpotToggle(spot.id)}
                  >
                    <div className="aspect-square">
                      <img 
                        src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&h=200&fit=crop'}
                        alt={spot.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* チェックマーク */}
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      selectedSpots.has(spot.id) 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white bg-opacity-80 text-gray-400'
                    }`}>
                      <Check size={16} />
                    </div>
                    
                    <div className="p-3 bg-white">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{spot.name}</h4>
                      <p className="text-xs text-gray-500 truncate">{spot.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={handleComplete}
                disabled={saving}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? '作成中...' : '完了'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
// マイマップ共有設定モーダル
const MapSharingModal = ({ isOpen, onClose, category, user, onUpdate }) => {
  const [sharingLevel, setSharingLevel] = useState(category?.sharing_mode || 'private');
  const [permission, setPermission] = useState(category?.permission_level || 'view');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && category) {
      setSharingLevel(category.sharing_mode || 'private');
      setPermission(category.permission_level || 'view');
      
      if (category.share_token) {
        const baseUrl = window.location.origin;
        setShareUrl(`${baseUrl}/mymap/shared/${category.share_token}`);
      }
    }
  }, [isOpen, category]);

  const handleSave = async () => {
    if (!user || !category) return;

    setSaving(true);
    try {
      let shareToken = category.share_token;
      
      if (!shareToken && sharingLevel !== 'private') {
        shareToken = crypto.randomUUID();
      }

      const { error } = await supabase
        .from('map_categories')
        .update({ 
          sharing_mode: sharingLevel,
          permission_level: permission,
          share_token: shareToken
        })
        .eq('id', category.id);

      if (!error) {
        onUpdate();
        onClose();
      } else {
        alert(`保存に失敗しました: ${error.message}`);
      }
    } catch (error) {
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

const handleDelete = async () => {
  if (!user || !category) return;
  
  if (!confirm(`「${category.name}」を削除してもよろしいですか？この操作は取り消せません。`)) {
    return;
  }

  setSaving(true);
  try {
    // 1. spot_categoriesの関連データを削除
    const { error: spotCategoriesError } = await supabase
      .from('spot_categories')
      .delete()
      .eq('category_id', category.id);

    if (spotCategoriesError) throw spotCategoriesError;

    // 2. カテゴリ自体を削除
    const { error: categoryError } = await supabase
      .from('map_categories')
      .delete()
      .eq('id', category.id);

    if (!categoryError) {
      onUpdate();
      onClose();
      alert('マイマップを削除しました');
    } else {
      alert(`削除に失敗しました: ${categoryError.message}`);
    }
  } catch (error) {
    alert(`予期しないエラー: ${error.message}`);
  } finally {
    setSaving(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">「{category?.name}」の共有・編集権限設定</h2>
          
          <div className="space-y-6">
            {/* 共有設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                共有設定
              </label>
              <select 
  value={sharingLevel}
  onChange={(e) => setSharingLevel(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
>
  <option value="private">プライベート</option>
  <option value="link">リンクを知っている全員</option>
  <option value="public">インターネット上の全員</option>
</select>
              <p className="text-xs text-gray-500 mt-1">
                {sharingLevel === 'private' && '自分だけがアクセスできます'}
                {sharingLevel === 'link' && 'リンクを持っている人がアクセスできます'}
                {sharingLevel === 'public' && '誰でもアクセスできます（検索結果にも表示）'}
              </p>
            </div>

            {/* 編集権限設定（共有時のみ表示） */}
            {sharingLevel !== 'private' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  編集権限
                </label>
                <select 
  value={permission}
  onChange={(e) => setPermission(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
>
  <option value="view">閲覧者</option>
  <option value="comment">コメント可能</option>
  <option value="edit">編集者</option>
</select>
                <p className="text-xs text-gray-500 mt-1">
                  {permission === 'view' && '表示のみ可能です'}
                  {permission === 'comment' && '表示とコメントが可能です'}
                  {permission === 'edit' && 'スポットの追加・削除・編集が可能です'}
                </p>
              </div>
            )}

            {sharingLevel !== 'private' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">共有URL</h3>
                <div className="flex gap-2">
                  <input type="text" value={shareUrl} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                  <button onClick={copyToClipboard} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'コピー済み' : 'コピー'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-4">
  <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">キャンセル</button>
  <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
</div>

{/* 削除ボタン */}
<div className="border-t pt-4">
  <button 
    onClick={handleDelete}
    disabled={saving}
    className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
  >
    このマイマップを削除
  </button>
</div>
          </div>
        </div>
      </div>
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
      const { error } = await supabase
        .from('profiles')
        .update({ privacy_setting: localPrivacy })
        .eq('user_id', user.id);

      if (!error) {
        setPrivacySetting(localPrivacy);
        onClose();
      } else {
        alert(`保存に失敗しました: ${error.message}`);
      }
    } catch (error) {
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
    <div 
  className="fixed inset-0 flex items-center justify-center z-[100] p-4" 
  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} 
  onClick={onClose}
>
  <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
  
  // Instagram風カテゴリ機能のstate
  const [categories, setCategories] = useState([]);
  const [categorySpotCounts, setCategorySpotCounts] = useState(new Map());
  const [categorySpotImages, setCategorySpotImages] = useState(new Map());
  const [selectedCategory, setSelectedCategory] = useState('all');
const [showCategoryModal, setShowCategoryModal] = useState(false);
const [openMenuId, setOpenMenuId] = useState(null);
const [showSharingModal, setShowSharingModal] = useState(false);
const [selectedCategoryForSharing, setSelectedCategoryForSharing] = useState(null);
  const router = useRouter();

  const handleAddToCategory = async (spotId, categoryId) => {
    if (!categoryId) return;
    
    try {
      const { error } = await supabase
        .from('spot_categories')
        .insert({
          spot_id: spotId,
          category_id: categoryId
        });
      
      if (error) throw error;
      alert('マイマップに追加しました！');
    } catch (error) {
      console.error('マイマップへの追加エラー:', error);
      alert('追加に失敗しました');
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await fetchFavoriteSpots(user.id);
        await fetchPrivacySetting(user.id);
        await fetchCategories(user.id);
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const fetchCategories = async (userId) => {
    try {
      // カテゴリ一覧取得
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('map_categories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);

      // 各カテゴリのスポット数を取得
      const counts = new Map();
      for (const category of categoriesData || []) {
        const { data: spotCategoriesData } = await supabase
          .from('spot_categories')
          .select('spot_id')
          .eq('category_id', category.id);
        
        counts.set(category.id, spotCategoriesData?.length || 0);
      }
      setCategorySpotCounts(counts);

// カテゴリ画像取得
await fetchCategorySpotImages(userId, categoriesData || []);
} catch (error) {
  console.error('カテゴリの取得に失敗:', error);
}
  };
  const fetchCategorySpotImages = async (userId, categories) => {
  try {
    const categoryImages = new Map();
    
    for (const category of categories) {
      const { data: spotCategoriesData } = await supabase
        .from('spot_categories')
        .select('spot_id')
        .eq('category_id', category.id)
        .limit(4);
      
      if (spotCategoriesData && spotCategoriesData.length > 0) {
        const spotIds = spotCategoriesData.map(sc => sc.spot_id);
        
        const { data: spotsData } = await supabase
          .from('spots')
          .select('image_url, name')
          .in('id', spotIds)
          .limit(4);
        
        categoryImages.set(category.id, spotsData || []);
      }
    }
    
    setCategorySpotImages(categoryImages);
  } catch (error) {
    console.error('カテゴリ画像取得エラー:', error);
  }
};

  const fetchPrivacySetting = async (userId) => {
    try {
      if (userId === '79eda0bf-3c12-44e5-9440-e09e4c21beba') {
        setPrivacySetting('unlisted');
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && data.privacy_setting) {
        setPrivacySetting(data.privacy_setting);
      }
    } catch (error) {
      console.error('公開設定の取得に失敗:', error);
    }
  };

  const fetchFavoriteSpots = async (userId) => {
    try {
      setLoading(true);
      
      const { data: favData, error: favError } = await supabase
        .from('user_favorites')
        .select('spot_id')
        .eq('user_id', userId);

      if (favError) throw favError;

      if (favData && favData.length > 0) {
        const spotIds = favData.map(fav => fav.spot_id);
        setFavorites(new Set(spotIds));

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
          setFavoriteSpots(prev => prev.filter(spot => spot.id !== spotId));
        }
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            spot_id: spotId
          });
        
        if (!error) {
          setFavorites(prev => new Set([...prev, spotId]));
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
    switch (privacySetting) {
      case 'public': return <Globe size={16} />;
      case 'unlisted': return <LinkIcon size={16} />;
      case 'private': 
      default: return <Lock size={16} />;
    }
  };

  const getPrivacyLabel = () => {
    switch (privacySetting) {
      case 'public': return '公開';
      case 'unlisted': return '限定公開';
      case 'private': 
      default: return '非公開';
    }
  };

  // カテゴリ選択時のスポットフィルタリング
  const [categorySpots, setCategorySpots] = useState([]);

const getFilteredSpots = async (categoryId) => {
  if (categoryId === 'all') {
    return favoriteSpots;
  }
  
  try {
    // 選択されたカテゴリのスポットIDを取得
    const { data: spotCategoriesData } = await supabase
      .from('spot_categories')
      .select('spot_id')
      .eq('category_id', categoryId);
    
    if (spotCategoriesData) {
      const spotIds = spotCategoriesData.map(sc => sc.spot_id);
      const filteredSpots = favoriteSpots.filter(spot => spotIds.includes(spot.id));
      setCategorySpots(filteredSpots);
      return filteredSpots;
    }
  } catch (error) {
    console.error('カテゴリスポット取得エラー:', error);
  }
  
  return [];
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
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeft size={20} />
                  <span>SpottMapに戻る</span>
                </a>
              </div>
              
                <a href="/auth"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogIn size={18} />
                ログイン
              </a>
            </div>
          </div>
        </header>

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
                <MapIcon size={20} className="text-blue-500 mt-1" />
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
                <Palette size={20} className="text-purple-500 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900">カテゴリ分類</h3>
                  <p className="text-gray-600 text-sm">カフェ、レストランなどで整理</p>
                </div>
              </div>
            </div>
          </div>

          
            <a href="/auth"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
          >
            <LogIn size={20} />
            ログインしてマイマップを始める
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
              
                <a href="/admin"
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
              <p className="text-red-100">カテゴリ別に整理して、効率的に管理できます</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{favoriteSpots.length}</div>
              <div className="text-sm text-red-100">お気に入りスポット</div>
            </div>
          </div>
        </div>

        {/* Instagram風カテゴリ一覧 */}
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">マイマップ</h3>
            <button 
  onClick={() => setShowCategoryModal(true)}
  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
>
              <Plus size={16} />
              新規作成
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* すべてのスポット */}
            <div 
  className="relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-200"
  onClick={() => router.push('/mymap/category/all')}
>
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group">
  <div className="relative w-full h-full p-2">
    <div className="grid grid-cols-2 gap-0.5 w-full h-full">
      {favoriteSpots.slice(0, 4).map((spot, index) => (
        <div key={index} className="bg-white rounded-md overflow-hidden">
          <InstagramEmbed 
            url={spot.instagram_url}
            fallbackImage={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&h=200&fit=crop'}
            spotName={spot.name}
          />
        </div>
      ))}
      {favoriteSpots.length < 4 && (
        Array.from({ length: 4 - favoriteSpots.length }).map((_, index) => (
          <div key={`empty-${index}`} className="bg-gray-300 rounded-md"></div>
        ))
      )}
    </div>
    {/* 全体にマスクオーバーレイ */}
    <div className="absolute inset-0 bg-black opacity-15 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none"></div>
  </div>
</div>
              <div className="p-3 bg-white">
                <h4 className="font-medium text-gray-900">すべてのスポット</h4>
                <p className="text-sm text-gray-500">{favoriteSpots.length}件</p>
              </div>
            </div>

            {/* カテゴリカード */}
            {categories.map((category) => (
              <div 
  key={category.id}
  className={`relative cursor-pointer rounded-2xl transition-all duration-200 ${
    selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''
  }`}
  onClick={(e) => {
    // 3点メニューまたはその子要素がクリックされた場合は遷移しない
    if (e.target.closest('.menu-button') || e.target.closest('.dropdown-menu')) {
      return;
    }
    router.push(`/mymap/category/${category.id}`);
  }}
>
                <div 
  className="aspect-square flex items-center justify-center overflow-hidden rounded-t-2xl"
  style={{ backgroundColor: category.color + '20' }}
>
                  <div className="w-full h-full p-2">
  {(() => {
    const categoryImages = categorySpotImages.get(category.id) || [];
    if (categoryImages.length > 0) {
      // スポットがある場合：1枚目の画像を大きく表示
      return (
        <div className="w-full h-full bg-white rounded-lg overflow-hidden group">
  <div className="relative w-full h-full">
    <img 
      src={categoryImages[0].image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=400&fit=crop'}
      alt={categoryImages[0].name}
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-black opacity-15 group-hover:opacity-0 transition-opacity duration-300"></div>
  </div>
</div>
      );
    } else {
      // スポットがない場合：Coffeeアイコン表示
      return (
        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
          <Coffee size={32} style={{ color: category.color }} />
        </div>
      );
    }
  })()}
</div>
                </div>
                <div className="p-3 bg-white flex justify-between items-start">
  <div className="flex-1">
    <h4 className="font-medium text-gray-900">{category.name}</h4>
    <p className="text-sm text-gray-500">{categorySpotCounts.get(category.id) || 0}件</p>
  </div>
  <div className="flex items-center gap-1">
    <button
      onClick={(e) => {
        e.stopPropagation();
        window.location.href = `/?category=${category.id}`;
      }}
      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      title="地図で見る"
    >
      <MapIcon size={18} />
    </button>
    <div className="relative">
      <button
  onClick={(e) => {
    e.stopPropagation();
    setSelectedCategoryForSharing(category);
    setShowSharingModal(true);
  }}
  className="menu-button p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
  title="設定"
>
  <MoreVertical size={18} />
</button>
    </div>
  </div>
</div>
              </div>
            ))}

            {/* 新規カテゴリ作成カード */}
<div 
  className="relative cursor-pointer rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
  onClick={() => setShowCategoryModal(true)}
>
  <div className="aspect-square bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Plus size={32} className="text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500 font-medium">新規マイマップ</p>
    </div>
  </div>
  <div className="p-3 bg-white">
    <h4 className="font-medium text-gray-900">マイマップを追加</h4>
    <p className="text-sm text-gray-500">分類を作成</p>
  </div>
</div>
          </div>
        </div>

        {/* 選択されたカテゴリのスポット一覧 */}
        {selectedCategory !== 'all' && (
          <div className="p-6 bg-white">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {categories.find(c => c.id === selectedCategory)?.name}のスポット
            </h3>
            
            {categorySpots.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  このマイマップにはまだスポットが登録されていません
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorySpots.map((spot) => (
                  <div key={spot.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="aspect-video">
                      <img 
                        src={spot.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop'}
                        alt={spot.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-gray-900 mb-2">{spot.name}</h4>
                      <p className="text-gray-600 text-sm mb-2">{spot.location}</p>
                      <p className="text-gray-500 text-xs">{spot.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        
     </main>

     {/* 公開設定モーダル */}
     <PrivacySettingsModal
       isOpen={showPrivacyModal}
       onClose={() => setShowPrivacyModal(false)}
       user={user}
       privacySetting={privacySetting}
       setPrivacySetting={setPrivacySetting}
       />

      {/* カテゴリ作成モーダル */}
      <CategoryCreateModal
  isOpen={showCategoryModal}
  onClose={() => setShowCategoryModal(false)}
  user={user}
  favoriteSpots={favoriteSpots}  // 追加
  onCategoryCreated={() => {
    if (user) {
      fetchCategories(user.id);
    }
  }}
/><MapSharingModal
  isOpen={showSharingModal}
  onClose={() => setShowSharingModal(false)}
  category={selectedCategoryForSharing}
  user={user}
  onUpdate={() => {
    if (user) {
      fetchCategories(user.id);
    }
  }}
/>
     <footer className="bg-gray-800 text-white p-4 text-center">
       <p>&copy; 2024 SpottMap - あなただけの特別なマップ</p>
     </footer>
   </div>
 );
}