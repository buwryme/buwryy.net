export interface BlogPost {
    slug: string;
    title: string;
    date: string;
    summary?: string;
    body: string;
}

const BLOG_URL = 'https://gist.githubusercontent.com/buwryme/e3844adacb4cf4ed14bccb649b4eb688/raw/blog.json';

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
