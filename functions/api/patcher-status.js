const GIST_URL =
  'https://gist.buwryy.net/buwryy/7832535a24564e5d8356f99166dd6c5c/raw/HEAD/tiktok-patcher-status';

export async function onRequestGet() {
  let message = 'working!';
  let color = 'green';

  try {
    const res = await fetch(`${GIST_URL}?t=${Date.now()}`);
    if (res.ok) {
      const value = (await res.text()).trim();
      if (value === '0') {
        message = 'patched out...';
        color = 'red';
      }
    }
  } catch {
    // fail soft: keep working! if the status gist can't be reached
  }

  return new Response(
    JSON.stringify({ schemaVersion: 1, label: 'patcher status', message, color }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      },
    },
  );
}
