const SETUP_SCRIPT =
  'https://git.buwryy.net/VKIntox/VKIntox/raw/branch/main/scripts/setup';

export function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      location: SETUP_SCRIPT,
      'cache-control': 'no-store',
    },
  });
}
