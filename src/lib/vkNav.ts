import type { HeaderNavItem } from '../components/SiteHeader';

export const VKINTOX_NAV: HeaderNavItem[] = [
    { label: 'VKIntox', to: '/vkintox', icon: 'vkintox', iconOnly: true, navKey: 'overview' },
    { label: 'Why VKIntox', to: '/vkintox', state: { scrollTo: 'why' }, navKey: 'why' },
    { label: 'Try it out', to: '/vkintox', state: { scrollTo: 'effects' }, navKey: 'effects' },
    { label: 'Documentation', to: '/vkintox/docs' },
    {
        label: 'Forgejo',
        to: 'https://git.buwryy.net/VKIntox/VKIntox',
        icon: 'forgejo',
        iconOnly: true,
        confirmExternal: true,
    },
];
