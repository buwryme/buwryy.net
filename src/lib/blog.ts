export interface BlogPost {
    slug: string;
    title: string;
    date: string;
    summary?: string;
    body: string;
}

const BLOG_URL = 'https://gist.buwryy.net/buwryy/603ba845a1dc45e4bc53a81d72114ffa/raw/HEAD/blog.json';

export async function loadPosts(): Promise<BlogPost[]> {
    const response = await fetch(`${BLOG_URL}?t=${Date.now()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`blog gist returned ${response.status}`);
    const data = await response.json();
    const posts = Array.isArray(data) ? data : [data];

    return posts
        .filter((post): post is BlogPost => Boolean(post && post.title && post.body))
        .map((post) => ({
            slug: String(post.slug ?? post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')),
            title: String(post.title),
            date: String(post.date ?? ''),
            summary: post.summary ? String(post.summary) : undefined,
            body: String(post.body),
        }))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
