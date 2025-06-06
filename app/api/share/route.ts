import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const url = formData.get('url') as string;
    const title = formData.get('title') as string;
    const text = formData.get('text') as string;

    console.log('共有受信:', { url, title, text });

    // Instagram URL or Google Maps URL を処理
    if (url) {
      // URLをクエリパラメータとして渡してメインページにリダイレクト
      const shareUrl = `/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}&text=${encodeURIComponent(text || '')}`;
      return redirect(shareUrl);
    }

    return redirect('/');
  } catch (error) {
    console.error('Share handling error:', error);
    return redirect('/');
  }
}

export async function GET() {
  // GET リクエストの場合はメインページにリダイレクト
  return redirect('/');
}