import type { HeaderNavItem } from '../components/SiteHeader';

export const ROSELINE_NAV: HeaderNavItem[] = [
    { label: 'Roséline', to: '/roseline', icon: 'roseline', navKey: 'overview' },
    { label: 'Features', to: '/roseline', state: { scrollTo: 'features' }, navKey: 'features' },
    { label: 'How it looks', to: '/roseline', state: { scrollTo: 'looks' }, navKey: 'looks' },
    {
        label: 'Forgejo',
        to: 'https://git.buwryy.net/buwryy/Roseline',
        icon: 'forgejo',
        iconOnly: true,
        confirmExternal: true,
    },
];
