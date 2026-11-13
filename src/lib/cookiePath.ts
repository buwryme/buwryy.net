// the scalloped "cookie" silhouette, shared by CookieShape and the small
// inline cookie markers around the site.
export function scallopedCirclePath(steps = 120, lobes = 12, amplitude = 2.8): string
{
    const centerX = 50;
    const centerY = 50;
    let path = '';

    for (let i = 0; i <= steps; i++)
    {
        const angle = (i * 2 * Math.PI) / steps;
        // shallow cosine scallops; 12 reads as the big cookie, 7 as the
        // smaller bullet marker
        const radius = 41 + amplitude * Math.cos(lobes * angle);
        const x = centerX + radius * Math.cos(angle - Math.PI / 2);
        const y = centerY + radius * Math.sin(angle - Math.PI / 2);
        path += (i === 0 ? 'M ' : ' L ') + x.toFixed(3) + ',' + y.toFixed(3);
    }

    return path + ' Z';
}

export const COOKIE_PATH = scallopedCirclePath(120, 12, 2.8);
export const COOKIE_SEVEN_PATH = scallopedCirclePath(140, 7, 3.4);
