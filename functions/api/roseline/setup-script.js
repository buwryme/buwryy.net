const SETUP_SCRIPT =
  'https://raw.githubusercontent.com/buwryme/Roseline/main/scripts/setup.sh';

export function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      location: SETUP_SCRIPT,
      'cache-control': 'no-store',
    },
  });
}
