import type { HeaderNavItem } from '../components/SiteHeader';

export const HOME_NAV: HeaderNavItem[] = [
    { label: 'Home', to: '/', symbol: 'home', navKey: 'home' },
    { label: 'VKIntox', to: '/vkintox', icon: 'vkintox' },
    { label: 'TikTok Patcher', to: '/tiktok-patcher', icon: 'tiktok' },
    { label: 'Blog Posts', to: '/blog', symbol: 'description', navKey: 'blog' },
    { label: 'Projects', to: '/', symbol: 'code', action: 'projects', navKey: 'projects' },
    { label: 'Socials', to: '/', symbol: 'public', action: 'socials' },
];
