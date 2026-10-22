const SETUP_SCRIPT =
  'https://raw.githubusercontent.com/VKIntox/VKIntox/refs/heads/main/scripts/setup';

export function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      location: SETUP_SCRIPT,
      'cache-control': 'no-store',
    },
  });
}
