import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
import Markdown from '../components/Markdown';
import PageBackdrop from '../components/PageBackdrop';
import { useSiteTheme } from '../lib/useSiteTheme';
import { HOME_NAV } from '../lib/homeNav';
import { loadPosts, type BlogPost } from '../lib/blog';
import './BlogPage.css';

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPage() {
    const { isDark, setTheme } = useSiteTheme();
    const { slug } = useParams();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [privacyClosing, setPrivacyClosing] = useState(false);
    const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
    const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);

    useEffect(() => {
        const previous = document.title;
        document.title = 'Blog — buwryy.net';
        return () => { document.title = previous; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        loadPosts()
            .then((loaded) => {
                if (cancelled) return;
                setPosts(loaded);
                setStatus('ready');
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });
        return () => { cancelled = true; };
    }, []);

    const post = slug ? posts.find((entry) => entry.slug === slug) : null;

    const onAction = (action: string) => {
        if (action === 'projects') navigate('/#projects');
        if (action === 'socials') navigate('/#socials');
    };

    return (
        <>
            <div className="vk-page">
                <PageBackdrop cookieSize={520} />
                <div className="page-shell">
                    <SiteHeader isDark={isDark} onThemeChange={setTheme} nav={HOME_NAV} onAction={onAction} />

                    <main className="blog-main">
                        {slug ? (
                            post ? (
                                <article className="blog-post">
                                    <Link to="/blog" className="blog-back">
                                        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                                        all posts
                                    </Link>
                                    <p className="blog-date">{formatDate(post.date)}</p>
                                    <h1>{post.title}</h1>
                                    {post.summary && <p className="blog-summary">{post.summary}</p>}
                                    <Markdown source={post.body} />
                                </article>
                            ) : (
                                <div className="blog-empty">
                                    <h1>{status === 'loading' ? 'loading the post.' : 'that post is not here.'}</h1>
                                    <Link to="/blog" className="m3-btn-tonal">back to the blog</Link>
                                </div>
                            )
                        ) : (
                            <>
                                <header className="blog-hero">
                                    <h1>Blog Posts</h1>
                                    <p className="blog-lede">
                                        some stuff i'd like to post about... this can include chatter.
                                    </p>
                                </header>

                                {status === 'loading' && <p className="blog-status">fetching posts…</p>}
                                {status === 'error' && (
                                    <p className="blog-status">
                                        could not reach the gist. the posts will be back when the network is.
                                    </p>
                                )}
                                {status === 'ready' && posts.length === 0 && (
                                    <p className="blog-status">nothing published yet.</p>
                                )}

                                <div className="blog-list">
                                    {posts.map((entry) => (
                                        <Link key={entry.slug} to={`/blog/${entry.slug}`} className="blog-card">
                                            <span className="blog-date">{formatDate(entry.date)}</span>
                                            <h2>{entry.title}</h2>
                                            {entry.summary && <p>{entry.summary}</p>}
                                            <span className="blog-read">read the post <span aria-hidden="true">→</span></span>
                                        </Link>
                                    ))}
                                </div>
                                <p className="blog-note" aria-disabled="true">did you know this uses one .json file</p>
                            </>
                        )}
                    </main>

                    <Footer
                        onPrivacyClick={() => setPrivacyOpen(true)}
                        onAcknowledgementsClick={() => setAcknowledgementsOpen(true)}
                    />
                </div>
            </div>

            <AcknowledgementsModal
                isOpen={acknowledgementsOpen}
                isClosing={acknowledgementsClosing}
                onClose={() => {
                    setAcknowledgementsClosing(true);
                    setTimeout(() => {
                        setAcknowledgementsOpen(false);
                        setAcknowledgementsClosing(false);
                    }, 200);
                }}
            />
            <PrivacyModal
                isOpen={privacyOpen}
                isClosing={privacyClosing}
                onClose={() => {
                    setPrivacyClosing(true);
                    setTimeout(() => {
                        setPrivacyOpen(false);
                        setPrivacyClosing(false);
                    }, 200);
                }}
            />
        </>
    );
}
