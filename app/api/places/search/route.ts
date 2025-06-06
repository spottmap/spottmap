import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, location, radius } = await request.json();
    
    // Google Places API (New) - Text Search
    const placesUrl = `https://places.googleapis.com/v1/places:searchText`;
    
    const requestBody = {
      textQuery: query,
      locationBias: {
        circle: {
          center: {
            latitude: parseFloat(location.split(',')[0]),
            longitude: parseFloat(location.split(',')[1])
          },
          radius: radius || 5000
        }
      },
      maxResultCount: 10,
      languageCode: 'ja'
    };

    const response = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.businessStatus,places.types'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Places API Error: ${response.status}`);
    }

    const data = await response.json();

    // デバッグ用：生データ確認
    console.log('=== Google Places生データ ===');
    console.log(JSON.stringify(data.places?.[0], null, 2));

    // カテゴリ変換関数
    const translateCategory = (types) => {
      if (!types || types.length === 0) return 'スポット';
      
      // 1. 最も具体的な飲食店カテゴリから判定
      if (types.includes('fast_food_restaurant')) return '飲食店';
      if (types.includes('hamburger_restaurant')) return '飲食店';
      if (types.includes('ramen_restaurant')) return '飲食店';
      if (types.includes('sushi_restaurant')) return '飲食店';
      if (types.includes('italian_restaurant')) return '飲食店';
      if (types.includes('chinese_restaurant')) return '飲食店';
      if (types.includes('japanese_restaurant')) return '飲食店';
      if (types.includes('indian_restaurant')) return '飲食店';
      if (types.includes('korean_restaurant')) return '飲食店';
      if (types.includes('meal_takeaway')) return '飲食店';
      if (types.includes('meal_delivery')) return '飲食店';
      
      // 2. カフェ系（ファストフード除外後）
      if (types.includes('coffee_shop')) return 'カフェ';
      if (types.includes('cafe')) return 'カフェ';
      
      // 3. ベーカリー
      if (types.includes('bakery')) return 'ベーカリー';
      
      // 4. バー・ナイトライフ
      if (types.includes('bar')) return 'バー';
      if (types.includes('night_club')) return 'バー';
      
      // 5. 小売店（具体的分類）
      if (types.includes('clothing_store')) return 'アパレル';
      if (types.includes('shoe_store')) return 'アパレル';
      if (types.includes('jewelry_store')) return 'アクセサリー';
      if (types.includes('electronics_store')) return '家電';
      if (types.includes('book_store')) return '本・雑貨';
      if (types.includes('furniture_store')) return '家具・インテリア';
      if (types.includes('home_goods_store')) return '家具・インテリア';
      if (types.includes('grocery_or_supermarket')) return 'スーパー';
      if (types.includes('convenience_store')) return 'コンビニ';
      if (types.includes('department_store')) return 'デパート';
      if (types.includes('shopping_mall')) return 'ショッピングモール';
      if (types.includes('pharmacy')) return 'ドラッグストア';
      if (types.includes('florist')) return '花屋';
      if (types.includes('pet_store')) return 'ペットショップ';
      if (types.includes('bicycle_store')) return 'スポーツ・趣味';
      if (types.includes('car_dealer')) return '車・バイク';
      
      // 6. 美容・サロン系
      if (types.includes('beauty_salon')) return '美容・サロン';
      if (types.includes('hair_care')) return '美容・サロン';
      if (types.includes('spa')) return '美容・サロン';
      
      // 7. エンタメ・施設系
      if (types.includes('gym')) return 'ジム・フィットネス';
      if (types.includes('movie_theater')) return 'エンタメ';
      if (types.includes('amusement_park')) return 'エンタメ';
      
      // 8. 汎用カテゴリ（最後の受け皿）
      if (types.includes('restaurant')) return '飲食店';
      if (types.includes('food')) return '飲食店';
      if (types.includes('store')) return '店舗';
      
      return 'スポット';
    };

    // SpottMapのデータ形式に変換
    const formattedResults = data.places?.map((place: any) => ({
      name: place.displayName?.text || '',
      location: place.formattedAddress || '',
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
      rating: place.rating || 0,
      category: translateCategory(place.types),
      types: place.types,
      image_url: place.photos?.[0] ? 
        `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` : 
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
      businessStatus: place.businessStatus,
      needsCreation: true
    })) || [];

    return NextResponse.json({ 
      success: true, 
      results: formattedResults 
    });

  } catch (error) {
    console.error('Places API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Places API - POST method required',
    usage: 'Send POST request with { query, location, radius }'
  });
}