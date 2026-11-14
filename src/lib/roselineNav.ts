import type { HeaderNavItem } from '../components/SiteHeader';

export const ROSELINE_NAV: HeaderNavItem[] = [
    { label: 'Roséline', to: '/roseline', icon: 'roseline', navKey: 'overview' },
    { label: 'Features', to: '/roseline', state: { scrollTo: 'features' }, navKey: 'features' },
    { label: 'How it looks', to: '/roseline', state: { scrollTo: 'looks' }, navKey: 'looks' },
    {
        label: 'GitHub',
        to: 'https://github.com/buwryme/Roseline',
        icon: 'github',
        iconOnly: true,
        confirmExternal: true,
    },
];
