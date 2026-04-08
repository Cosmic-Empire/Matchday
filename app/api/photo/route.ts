import { NextRequest, NextResponse } from 'next/server';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'football stadium';

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=squarish&color=color`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        next: { revalidate: 3600 },
      }
    );

    const data = await res.json();
    const photos = data.results || [];

    if (photos.length === 0) {
      // Retry without color filter
      const res2 = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=squarish`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      const data2 = await res2.json();
      const fallbackPhotos = data2.results || [];
      if (fallbackPhotos.length === 0) return NextResponse.json({ url: null });
      const photo = fallbackPhotos[0];
      return NextResponse.json({
        url: photo.urls.regular,
        thumb: photo.urls.small,
        credit: photo.user.name,
        color: photo.color || '#00FF87',
      });
    }

    // Pick randomly from results
    const photo = photos[Math.floor(Math.random() * photos.length)];
    return NextResponse.json({
      url: photo.urls.regular,
      thumb: photo.urls.small,
      credit: photo.user.name,
      color: photo.color || '#00FF87',
    });

  } catch (error) {
    console.error('[photo] Error:', error);
    return NextResponse.json({ url: null });
  }
}