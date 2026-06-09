interface Env {
  YOUTUBE_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const playlistId = url.searchParams.get('playlistId');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (!playlistId) {
    return new Response(JSON.stringify({ error: 'Missing playlistId' }), { status: 400, headers });
  }

  const apiKey = context.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'YouTube API not configured on server' }), { status: 500, headers });
  }

  try {
    // Get playlist metadata
    const metaRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${apiKey}`
    );
    const metaData = (await metaRes.json()) as any;
    const playlistTitle: string = metaData.items?.[0]?.snippet?.title ?? 'YouTube Playlist';

    // Page through all playlist items
    const tracks: Array<{ title: string; channel: string; thumbnail: string | null }> = [];
    let pageToken = '';

    do {
      const itemsUrl =
        `https://www.googleapis.com/youtube/v3/playlistItems` +
        `?part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${apiKey}` +
        (pageToken ? `&pageToken=${pageToken}` : '');

      const itemsRes = await fetch(itemsUrl);
      const itemsData = (await itemsRes.json()) as any;

      if (!itemsRes.ok) {
        return new Response(
          JSON.stringify({ error: itemsData.error?.message ?? 'YouTube API error' }),
          { status: itemsRes.status, headers }
        );
      }

      for (const item of itemsData.items ?? []) {
        const title: string = item.snippet?.title ?? '';
        if (title && title !== 'Deleted video' && title !== 'Private video') {
          tracks.push({
            title,
            channel: item.snippet?.videoOwnerChannelTitle ?? '',
            thumbnail: item.snippet?.thumbnails?.default?.url ?? null,
          });
        }
      }

      pageToken = itemsData.nextPageToken ?? '';
    } while (pageToken);

    return new Response(JSON.stringify({ playlistTitle, tracks }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch playlist' }), { status: 500, headers });
  }
};
