const SETUP_SCRIPT =
  'https://git.buwryy.net/buwryy/Roseline/raw/branch/main/scripts/setup.sh';

export function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      location: SETUP_SCRIPT,
      'cache-control': 'no-store',
    },
  });
}
