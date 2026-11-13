import type { HeaderNavItem } from '../components/SiteHeader';

export const VKINTOX_NAV: HeaderNavItem[] = [
    { label: 'VKIntox', to: '/vkintox', icon: 'vkintox', iconOnly: true, navKey: 'overview' },
    { label: 'Why VKIntox', to: '/vkintox', state: { scrollTo: 'why' }, navKey: 'why' },
    { label: 'Try it out', to: '/vkintox', state: { scrollTo: 'effects' }, navKey: 'effects' },
    { label: 'Documentation', to: '/vkintox/docs' },
    {
        label: 'GitHub',
        to: 'https://github.com/VKIntox/VKIntox',
        icon: 'github',
        iconOnly: true,
        confirmExternal: true,
    },
];
