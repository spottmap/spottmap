import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 距離計算（GPS座標）
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
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
export const calculateNameSimilarity = (name1, name2) => {
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
export const findDuplicates = async (candidate) => {
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

// Google Places API検索
export const searchPlacesAPI = async (query) => {
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

// ★表示付きスマート検索（メイン関数）
export const searchWithDuplicateCheck = async (query) => {
  const results = await searchPlacesAPI(query);
  
  // 各候補に★表示判定を追加
  const resultsWithStatus = await Promise.all(
    results.map(async (candidate) => {
      const duplicates = await findDuplicates(candidate);
      return {
        ...candidate,
        isRegistered: duplicates.length > 0
      };
    })
  );
  
  return resultsWithStatus;
};