import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import PageBackdrop from '../components/PageBackdrop';
import Footer from '../components/Footer';
import PrivacyModal from '../components/PrivacyModal';
import AcknowledgementsModal from '../components/AcknowledgementsModal';
import { useSiteTheme } from '../lib/useSiteTheme';
import { VKINTOX_NAV } from '../lib/vkNav';
import './VKIntoxDocsPage.css';

const INSTALL = 'curl -fsSL https://buwryy.net/api/vkintox/setup-script | bash';
const UNINSTALL = 'curl -fsSL https://buwryy.net/api/vkintox/setup-script | bash -s -- uninstall';
const BUILD = `git clone --recurse-submodules https://github.com/VKIntox/VKIntox.git
cd VKIntox
meson setup --buildtype=release --prefix=/usr build
meson compile -C build
meson test -C build --print-errorlogs
sudo meson install -C build`;
const RUN = `ENABLE_VKINTOX=1 ./your-game
# steam launch option:
ENABLE_VKINTOX=1 %command%`;
const LOCAL_SETUP = `git clone --recurse-submodules https://github.com/VKIntox/VKIntox.git
cd VKIntox
just configure
./setup system
# or:
./setup sober
./setup flatpak APP_ID`;
const LOG = `VKINTOX_LOG_LEVEL=debug ENABLE_VKINTOX=1 ./your-game
# saves to ~/.config/VKIntox/vkintox.log`;

const SECTIONS = [
    { id: 'overview', title: 'What it is' },
    { id: 'install', title: 'Install and enable' },
    { id: 'overlay', title: 'The overlay' },
    { id: 'effects', title: 'Effects' },
    { id: 'depth', title: 'Depth' },
    { id: 'frame-dumping', title: 'Frame dumping' },
    { id: 'files', title: 'Files and environment' },
    { id: 'build', title: 'Building from source' },
    { id: 'shader-packages', title: 'Shader packages' },
    { id: 'setup-scripts', title: 'Setup scripts' },
    { id: 'ci', title: 'Continuous integration' },
    { id: 'releases', title: 'Releases' },
    { id: 'versioning', title: 'Versioning' },
    { id: 'backend', title: 'Backend and architecture' },
    { id: 'third-party', title: 'Third-party components' },
    { id: 'troubleshooting', title: 'Troubleshooting' },
];

const NAV_GROUPS = [
    { label: 'Overview', to: 'overview', ids: ['overview'] },
    { label: 'Install', to: 'install', ids: ['install'] },
    { label: 'Usage', to: 'overlay', ids: ['overlay', 'effects', 'depth', 'frame-dumping'] },
    {
        label: 'Reference',
        to: 'files',
        ids: ['files', 'build', 'shader-packages', 'setup-scripts', 'ci', 'releases', 'versioning', 'backend', 'third-party'],
    },
    { label: 'Troubleshooting', to: 'troubleshooting', ids: ['troubleshooting'] },
];

function CopyBlock({ code, label }: { code: string; label: string })
{
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try
        {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        }
        catch { /* clipboard can be blocked */ }
    };

    return (
        <div className="vk-docs-code">
            <div className="vk-docs-code-head">
                <span>{label}</span>
                <button type="button" onClick={copy} className="vk-docs-copy">
                    {copied ? 'copied' : 'copy'}
                </button>
            </div>
            <pre><code>{code}</code></pre>
        </div>
    );
}

function Callout({ kind = 'note', label, children }: { kind?: 'note' | 'caution' | 'key'; label?: string; children: React.ReactNode })
{
    const labels = { note: 'note', caution: 'caution', key: 'key point' };

    return (
        <aside className={`vk-docs-callout is-${kind}`}>
            <span className="vk-docs-callout-label">{label ?? labels[kind]}</span>
            <div>{children}</div>
        </aside>
    );
}

export default function VKIntoxDocsPage()
{
    const { isDark, setTheme } = useSiteTheme();
    const [active, setActive] = useState(SECTIONS[0].id);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [privacyClosing, setPrivacyClosing] = useState(false);
    const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
    const [acknowledgementsClosing, setAcknowledgementsClosing] = useState(false);

    useEffect(() => {
        const previous = document.title;
        document.title = 'VKIntox documentation — buwryy.net';
        return () => { document.title = previous; };
    }, []);

    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (id)
        {
            requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
            return;
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    useEffect(() => {
        const track = () => {
            const scroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
            let current = SECTIONS[0].id;
            for (const section of SECTIONS)
            {
                const element = document.getElementById(section.id);
                if (element && element.getBoundingClientRect().top + scroll <= scroll + 160) current = section.id;
            }
            setActive(current);
        };

        track();
        window.addEventListener('scroll', track, { passive: true });
        document.addEventListener('scroll', track, true);
        window.addEventListener('resize', track);
        const timer = window.setInterval(track, 120);
        return () => {
            window.removeEventListener('scroll', track);
            document.removeEventListener('scroll', track, true);
            window.removeEventListener('resize', track);
            window.clearInterval(timer);
        };
    }, []);

    const activeGroup = NAV_GROUPS.find((group) => group.ids.includes(active))?.label ?? 'Overview';
    const activeIndex = Math.max(0, SECTIONS.findIndex((section) => section.id === active));
    const previousSection = SECTIONS[activeIndex - 1];
    const nextSection = SECTIONS[activeIndex + 1];

    return (
        <>
            <div className="vk-page">
                <PageBackdrop cookieSize={520} />
                <div className="page-shell">
                    <SiteHeader isDark={isDark} onThemeChange={setTheme} nav={VKINTOX_NAV} />

                    <main className="vk-docs">
                        <aside className="vk-docs-nav">
                            <div className="vk-docs-nav-head">
                                <span className="vk-docs-nav-title">VKIntox</span>
                                <span className="vk-docs-nav-sub">documentation</span>
                            </div>
                            <nav aria-label="Documentation">
                                {NAV_GROUPS.map((group) => (
                                    <a
                                        key={group.label}
                                        href={`#${group.to}`}
                                        className={activeGroup === group.label ? 'is-active' : ''}
                                        aria-current={activeGroup === group.label ? 'location' : undefined}
                                    >
                                        {group.label}
                                    </a>
                                ))}
                            </nav>
                            <div className="vk-docs-nav-meta">
                                <span>v0.2.2-preview.1</span>
                                <a href="https://github.com/VKIntox/VKIntox" target="_blank" rel="noopener">source on github</a>
                            </div>
                        </aside>

                        <article className="vk-docs-body">
                            <header className="vk-docs-hero">
                                <nav className="vk-docs-breadcrumb" aria-label="Breadcrumb">
                                    <Link to="/vkintox">VKIntox</Link>
                                    <span>/</span>
                                    <span>documentation</span>
                                </nav>
                                <h1>VKIntox documentation</h1>
                                <p className="vk-docs-lede">
                                    VKIntox is a Vulkan PostFX layer for <em>native</em> Linux games. It runs
                                    ReShade HLSL shaders, actually has proper depth, and has a Material 3
                                    in-game overlay. This documentation covers... pretty much everything.
                                </p>
                                <div className="vk-docs-meta">
                                    <span>v0.2.2-preview.1</span>
                                    <span>x86_64 · aarch64</span>
                                    <span>GPL-3.0-or-later</span>
                                    <span>beta</span>
                                </div>

                                <details className="vk-docs-mobile-toc">
                                    <summary>On this page</summary>
                                    <nav>
                                        {SECTIONS.map((section) => (
                                            <a
                                                key={section.id}
                                                href={`#${section.id}`}
                                                className={active === section.id ? 'is-active' : ''}
                                                aria-current={active === section.id ? 'location' : undefined}
                                            >
                                                {section.title}
                                            </a>
                                        ))}
                                    </nav>
                                </details>

                                <div className="vk-docs-start">
                                    <div>
                                        <p className="vk-docs-start-label">install using this</p>
                                        <p>Paste this. It installs the layer, the shader packages, and the setup wrapper. The script asks which target you want.</p>
                                        <div className="vk-docs-quick">
                                            <span className="vk-kbd">home</span> overlay
                                            <span className="vk-kbd">end</span> effects
                                            <span className="vk-kbd">f10</span> reload
                                        </div>
                                    </div>
                                    <CopyBlock code={INSTALL} label="install" />
                                </div>
                            </header>

                            <section className="vk-docs-section" id="overview">
                                <div className="vk-docs-section-head">
                                    <span>01</span>
                                    <h2>What it is</h2>
                                </div>
                                <p>
                                    VKIntox is a Vulkan layer. The loader puts it between the game and the GPU
                                    driver, so the game binary stays untouched and does not need to know the
                                    layer is there. VKIntox wraps the swapchain, runs its effect chain over the
                                    final image, and presents the result.
                                </p>
                                <p>
                                    If you have previously used vkBasalt, your mind will be blown when using
                                    VKIntox. The biggest difference is the proper depth that vkBasalt had
                                    historically dismissed as experimental, which meant vkBasalt was only ever
                                    suitable for basic effects. That is exactly what lets effects like AO, SSR,
                                    DOF and similar actually render properly.
                                </p>
                                <p>
                                    The overlay is a patched Dear ImGui build with a from-scratch Material 3
                                    implementation. Effects, presets, per-game profiles, depth settings,
                                    diagnostics, and the theme are all edited in-game. Changes apply live.
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <tbody>
                                            <tr><th>form</th><td>implicit Vulkan layer, <code>libvkintox.so</code></td></tr>
                                            <tr><th>platform</th><td>Linux, X11 and Wayland</td></tr>
                                            <tr><th>architectures</th><td>x86_64 and aarch64</td></tr>
                                            <tr><th>shader input</th><td>ReShade <code>.fx</code>, compiled to SPIR-V at runtime</td></tr>
                                            <tr><th>ui</th><td>Dear ImGui, patched to Material 3</td></tr>
                                            <tr><th>status</th><td>public beta, source under GPL-3.0-or-later</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="vk-docs-section" id="install">
                                <div className="vk-docs-section-head">
                                    <span>02</span>
                                    <h2>Install and enable</h2>
                                </div>
                                <p>
                                    Use the remote installer unless you are packaging VKIntox yourself. It picks
                                    a prebuilt for Arch, Fedora, openSUSE, Debian, Nix, or Flatpak when one
                                    matches your system. If none does, build from a checkout with{' '}
                                    <code>./setup</code>. Every prompt has a default, so pressing enter through
                                    it is fine.
                                </p>
                                <CopyBlock code={INSTALL} label="install" />
                                <p>
                                    Uninstalling removes the installed layer and its manifest. It leaves your
                                    config, shader packages, presets, and per-game profiles alone.
                                </p>
                                <CopyBlock code={UNINSTALL} label="uninstall" />
                                <p>
                                    The layer only loads when a process asks for it. The manifest wires that
                                    to <code>ENABLE_VKINTOX=1</code>, and <code>DISABLE_VKINTOX=1</code> wins
                                    if both are set.
                                </p>
                                <CopyBlock code={RUN} label="enable per process" />
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>target</th><th>what it does</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td><code>./setup system</code></td><td>builds and installs system-wide</td></tr>
                                            <tr><td><code>./setup sober</code></td><td>builds and configures the layer for Sober</td></tr>
                                            <tr><td><code>./setup flatpak APP_ID</code></td><td>builds and configures the layer for one Flatpak app</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>key</th><th>action</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td><span className="vk-kbd">home</span></td><td>show or hide the overlay</td></tr>
                                            <tr><td><span className="vk-kbd">end</span></td><td>enable or disable every effect</td></tr>
                                            <tr><td><span className="vk-kbd">f10</span></td><td>reload the config and recompile shaders</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <Callout kind="note">
                                    The Flatpak build is a Vulkan layer extension for{' '}
                                    <code>org.freedesktop.Platform</code> 26.08. Apps on another Freedesktop
                                    branch will not load it. A reboot can be needed after updating or
                                    reinstalling the layer for a Flatpak target.
                                </Callout>
                            </section>

                            <section className="vk-docs-section" id="overlay">
                                <div className="vk-docs-section-head">
                                    <span>03</span>
                                    <h2>The overlay</h2>
                                </div>
                                <p>
                                    <span className="vk-kbd">home</span> opens the window. It is resizable and
                                    movable, right-click the title bar to drag it, and it is anchored to the game
                                    framebuffer rather than the desktop. Everything below lives behind the top
                                    navigation.
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>view</th><th>what is in it</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>main</td><td>the effect list with enable toggles, live parameters, and the active shader INI preset</td></tr>
                                            <tr><td>add effects</td><td>installed packages, ranked search, recents, and a duplicate stepper for each effect</td></tr>
                                            <tr><td>configs</td><td>create, rename, delete, and set the default preset for a game</td></tr>
                                            <tr><td>shader manager</td><td>shader directories, discovered paths, compile testing, and depth requirements</td></tr>
                                            <tr><td>settings</td><td>controls, behaviour, appearance, depth, developer options, and layout</td></tr>
                                            <tr><td>advanced</td><td>tracked depth views, a pinned view, encoding, invert, flip, mirror, and rebuild</td></tr>
                                            <tr><td>diagnostics</td><td>frame time, 1% and 0.1% FPS lows, GPU and VRAM graphs, and frame dumping</td></tr>
                                            <tr><td>about</td><td>the version compiled into the library, licences, and project links</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p>
                                    The theme editor takes a seed colour, a Material 3 variant, contrast, and a
                                    light or dark base, then lets you edit every colour role, density, and
                                    corner scale. Matugen themes hot-reload. It is a lot of knobs, and all of
                                    them apply live.
                                </p>
                                <p>
                                    Backdrop blur captures the frame behind the window, downsamples it, and
                                    runs a separable gaussian before the UI is drawn. Toggle, opacity, size,
                                    and 1 to 10 passes are exposed.
                                </p>
                                <p>
                                    On X11 the overlay takes a pointer grab while the cursor is over it, and a
                                    keyboard grab only while it is consuming keys. On Wayland, popups withhold
                                    input so clicks do not leak into the game. Games that bypass SDL or GLFW for
                                    input can still defeat that blocking.
                                </p>
                            </section>

                            <section className="vk-docs-section" id="effects">
                                <div className="vk-docs-section-head">
                                    <span>04</span>
                                    <h2>Effects</h2>
                                </div>
                                <p>
                                    Effects are ReShade <code>.fx</code> files. VKIntox parses them at runtime,
                                    generates SPIR-V, and builds a pipeline for the current output extent. The
                                    compile cache is keyed by source and flags, so reloading a chain does not
                                    re-parse every shader. Compile errors show up in the shader manager and the
                                    log instead of failing silently at draw time.
                                </p>
                                <p>
                                    The installer reads <code>EffectPackages.ini</code>, downloads each listed
                                    package, and groups it under <code>reshade/</code>. The built-in shaders live
                                    in their own package, built from the separate{' '}
                                    <a href="https://github.com/VKIntox/VKIntoxEffects" target="_blank" rel="noopener">VKIntoxEffects</a>{' '}
                                    repository. That package carries the built-in shaders: IntoxSSR, IntoxMXAO,
                                    IntoxDepthColorCorrection, MSAA, ExponentialFog, and IntoxRimlight.
                                </p>
                                <ul>
                                    <li>Effects can be enabled, disabled, duplicated, and reordered in the main view.</li>
                                    <li>Parameters are edited inline and saved into the active preset.</li>
                                    <li>Shader INI presets use ReShade's format and can be imported through the desktop portal.</li>
                                    <li>Each game gets its own profile, keyed by executable name, with its own effect list and parameters.</li>
                                    <li>The shader manager compile-tests every discovered shader and marks the ones that need a depth buffer.</li>
                                </ul>
                                <Callout kind="caution">
                                    Some shaders use features the compiler doesn't implement, or generally, the
                                    shader might look wrong and/or inaccurate.
                                </Callout>
                            </section>

                            <section className="vk-docs-section" id="depth">
                                <div className="vk-docs-section-head">
                                    <span>05</span>
                                    <h2>Depth</h2>
                                </div>
                                <p>
                                    Depth capture is on by default, so depth effects work on a game's first
                                    launch without a restart. VKIntox tracks depth images as the game creates and
                                    uses them, then copies the right one before the frame is presented. MSAA
                                    depth goes through a resolve pass; single-sample depth is copied directly.
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>setting</th><th>options</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>capture method</td><td><code>off</code>, <code>renderpass-end</code> (recommended), <code>queue-submit</code> (fallback that survives more games)</td></tr>
                                            <tr><td>resolve mode</td><td><code>auto</code> (prefer average), <code>sample-zero</code>, <code>average</code></td></tr>
                                            <tr><td>orientation</td><td>invert in settings, plus flip and mirror in advanced</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p>
                                    The default is <code>queue-submit</code>, because it survives more engine
                                    layouts. Switch to <code>renderpass-end</code> when a game exposes depth
                                    cleanly and you want the earliest possible copy. If AO or SSR looks like it is
                                    reading the wrong plane, flip the invert toggle first, then pin the actual
                                    depth view in the advanced tab.
                                </p>
                                <p>
                                    Sober and rosemary start with inverted depth because their depth reads that
                                    way. Other games default to normal orientation. The choice is stored per game,
                                    so a fix applies to one executable and does not follow you to the next.
                                </p>
                            </section>

                            <section className="vk-docs-section" id="frame-dumping">
                                <div className="vk-docs-section-head">
                                    <span>06</span>
                                    <h2>Frame dumping</h2>
                                </div>
                                <p>
                                    Diagnostics allows you to dump the current frame. It hides the overlay on
                                    dump, and packs your frame into a &quot;packed&quot; PNG: backbuffer on the
                                    left and depth on the right. Quality is deliberately lossless. This can aid
                                    with both debugging and other purposes.
                                </p>
                            </section>

                            <section className="vk-docs-section" id="files">
                                <div className="vk-docs-section-head">
                                    <span>07</span>
                                    <h2>Files and environment</h2>
                                </div>
                                <p>
                                    Native installs keep everything under the XDG config directory. Flatpak apps
                                    and Sober keep the same tree inside their own sandbox config directory.
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>path</th><th>contents</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td><code>~/.config/VKIntox/VKIntox.conf</code></td><td>global settings</td></tr>
                                            <tr><td><code>~/.config/VKIntox/configs/&lt;game&gt;.conf</code></td><td>per-game effects and parameters</td></tr>
                                            <tr><td><code>~/.config/VKIntox/configs/shaders/*.ini</code></td><td>ReShade presets</td></tr>
                                            <tr><td><code>~/.config/VKIntox/reshade/</code></td><td>installed shader packages</td></tr>
                                            <tr><td><code>~/.config/VKIntox/vkintox.log</code></td><td>the log</td></tr>
                                            <tr><td><code>~/.var/app/&lt;app-id&gt;/config/VKIntox/</code></td><td>the same tree for a Flatpak app</td></tr>
                                            <tr><td><code>~/.var/app/org.vinegarhq.Sober/config/VKIntox/</code></td><td>the same tree for Sober</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p>
                                    Older installs used <code>~/.local/share/VKIntox/VKIntox.conf</code>. That
                                    file is read once and migrated. Config writes are atomic and run on a
                                    background writer, so a crash or a killed process does not leave half a
                                    config behind.
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>variable</th><th>effect</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td><code>ENABLE_VKINTOX=1</code></td><td>loads the layer in this process</td></tr>
                                            <tr><td><code>DISABLE_VKINTOX=1</code></td><td>keeps the layer off, even if another wrapper enabled it</td></tr>
                                            <tr><td><code>VKINTOX_LOG_LEVEL</code></td><td><code>trace</code>, <code>debug</code>, <code>info</code>, <code>warn</code>, <code>error</code>, or <code>none</code></td></tr>
                                            <tr><td><code>VKINTOX_LOG_FILE</code></td><td>writes the log somewhere other than the default</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="vk-docs-section" id="build">
                                <div className="vk-docs-section-head">
                                    <span>08</span>
                                    <h2>Building from source</h2>
                                </div>
                                <p>
                                    VKIntox uses Meson and Ninja. You'll need a C++20 compiler, Meson, Ninja,
                                    {' '}<code>glslangValidator</code>, and the Vulkan loader headers. The window
                                    side needs X11, Xi, XTest, Wayland client, wayland-protocols, xkbcommon, and
                                    pkg-config. GIO is optional and enables the desktop portal file picker;
                                    without it the shader manager falls back to its own browser. The UI and
                                    ReShade compiler are git submodules, so clone recursively.
                                </p>
                                <CopyBlock code={BUILD} label="build and install" />
                                <p>
                                    The first build is the slow one. Later builds reuse the same directory.
                                </p>
                                <p>
                                    Meson options:
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>option</th><th>default</th><th>purpose</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td><code>-Dwith_so</code></td><td><code>true</code></td><td>install the layer library</td></tr>
                                            <tr><td><code>-Dwith_json</code></td><td><code>true</code></td><td>install the layer manifest</td></tr>
                                            <tr><td><code>-Dappend_libdir_vkintox</code></td><td><code>false</code></td><td>install into <code>&lt;libdir&gt;/vkintox</code></td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p>
                                    The main outputs are <code>build/src/libvkintox.so</code>, the{' '}
                                    <code>vkintox-shader-check</code> helper, and the test executables. Install
                                    places the library in libdir, the manifest in{' '}
                                    <code>share/vulkan/implicit_layer.d</code>, the wrapper in{' '}
                                    <code>bin/vkintox-run</code>, and licences in{' '}
                                    <code>share/licenses/vkintox</code>.
                                </p>
                                <p>
                                    The root Justfile shortcuts the common paths: <code>just configure</code>,
                                    <code>just build</code>, <code>just run vkcube</code>, and{' '}
                                    <code>just run-debug /tmp/vkintox.log vkcube</code>. The dev recipes write a
                                    temporary manifest with a distinct layer name and point the loader at the build
                                    directory, so a system copy cannot shadow the build under test.
                                </p>
                                <p>
                                    On x86_64, <code>scripts/arm64-smoke.sh</code> cross-checks an aarch64 build
                                    through podman and qemu-user. Release builds for aarch64 run natively on ARM
                                    runners except for the Arch and Debian packages, which are built in emulated
                                    containers.
                                </p>
                                <p>
                                    To compile the shader packages without launching a game:
                                </p>
                                <CopyBlock
                                    code="python3 src/tests/test_reshade_shaders.py --shader-check build/src/vkintox-shader-check"
                                    label="shader check"
                                />
                            </section>

                            <section className="vk-docs-section" id="shader-packages">
                                <div className="vk-docs-section-head">
                                    <span>09</span>
                                    <h2>Shader packages</h2>
                                </div>
                                <p>
                                    VKIntox fetches the same shader packages ReShade does, except they're
                                    trimmed down to a clean subset that are documented to work well under
                                    VKIntox (or, at least, compile). These include:
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>package</th><th>description</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>Standard effects</td><td>A small set of utility effects (DisplayDepth, UIMask, ...)</td></tr>
                                            <tr><td>SweetFX by CeeJay.dk</td><td>The original SweetFX shader collection (LumaSharpen, SMAA, ...)</td></tr>
                                            <tr><td>Legacy effects</td><td>Effects known from previous ReShade versions (AmbientLight, ...)</td></tr>
                                            <tr><td>FXShaders by luluco250</td><td>Various bloom effects, Flashlight, ...</td></tr>
                                            <tr><td>qUINT by Marty McFly</td><td>The qUINT shader framework (MXAO, Lightroom, ...)</td></tr>
                                            <tr><td>Color effects by prod80</td><td>An extensive collection of color and contrast manipulation effects</td></tr>
                                            <tr><td>AstrayFX by BlueSkyDefender</td><td>Effects that strayed away from the Depth3D repository</td></tr>
                                            <tr><td>GShade-Shaders by Marot</td><td>A hodgepodge collection of original and legacy shaders maintained on behalf of the GShade project.</td></tr>
                                            <tr><td>VKIntox effects</td><td>Built-in effects</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p>
                                    Even with that, not all effects behave perfectly as ReShade would.
                                </p>
                                <p>
                                    We also have built-in shaders that include SSR, MXAO, a rimlight,
                                    depth-based colour correction and MSAA along with a height-based fog.
                                </p>
                            </section>

                            <section className="vk-docs-section" id="setup-scripts">
                                <div className="vk-docs-section-head">
                                    <span>10</span>
                                    <h2>Setup scripts</h2>
                                </div>
                                <p>
                                    VKIntox has two separate setup scripts: remote and local. Remote fetches
                                    builds that are pushed using GitHub Actions, meaning it is the fastest.
                                    Local tracks the latest changes, but builds locally, which is slower.
                                </p>

                                <h3>Remote</h3>
                                <p>
                                    The remote setup script is served from <code>scripts/setup</code>. It
                                    installs the <code>.fx</code> shaders from <code>EffectPackages.ini</code>.
                                    The rest is self explanatory. For Flatpak installs, Sober and Roseline are
                                    preferred.
                                </p>
                                <CopyBlock code={INSTALL} label="remote install" />
                                <CopyBlock code={UNINSTALL} label="remote uninstall" />
                                <Callout kind="caution">
                                    <p>
                                        Flatpak installs override <code>ENABLE_VKINTOX=1</code> into whatever
                                        the Flatpak itself launches. This, for example, might break Steam, if it
                                        renders using Vulkan. For this, disable the override using Flatseal and
                                        apply the override to your game launch command instead (
                                        <code>ENABLE_VKINTOX=1 %command%</code>).
                                    </p>
                                </Callout>

                                <h3>Local</h3>
                                <p>
                                    The local setup script is at <code>setup</code>. It requires running{' '}
                                    <code>just configure</code> beforehand, and installing needed
                                    dependencies/libraries: a C++20 compiler, Meson, Ninja,{' '}
                                    <code>glslangValidator</code>, and the Vulkan loader headers, along with
                                    X11, Xi, XTest, Wayland client, wayland-protocols, xkbcommon, and
                                    pkg-config. GIO is optional and enables the desktop portal file picker
                                    integration. This is mostly faster than compiling manually.
                                </p>
                                <CopyBlock code={LOCAL_SETUP} label="local install" />
                            </section>

                            <section className="vk-docs-section" id="ci">
                                <div className="vk-docs-section-head">
                                    <span>11</span>
                                    <h2>Continuous integration</h2>
                                </div>
                                <p>
                                    <code>.github/workflows/ci.yml</code> runs on pushes to main, master, and
                                    v0.1.3-experimental, and on pull requests, when build inputs change. There are                                    two jobs: x86_64 on Ubuntu 26.04 and aarch64 on Ubuntu 24.04 ARM.
                                </p>
                                <p>
                                    Each job installs the same dependencies as a local build, configures Meson with
                                    Clang in release mode, compiles the layer and every test, runs the test suite,
                                    compiles all ReShade package shaders, compiles the built-in shaders, then runs
                                    vkcube under Xvfb with lavapipe. The smoke script installs its own layer
                                    manifest and checks that the loader actually loaded the build under test, so a
                                    pass cannot be a vacuous run where VKIntox never loaded.
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>suite</th><th>what it protects</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>config serializer</td><td>profile round-trips, legacy migration, imported presets, path rejection</td></tr>
                                            <tr><td>vk handle ordering</td><td>views die before the images they read, memory is freed last</td></tr>
                                            <tr><td>async writer</td><td>FIFO writes, thrown jobs, idle barriers, concurrent submitters</td></tr>
                                            <tr><td>compile cache</td><td>keying, eviction, clear, hash determinism, threaded access</td></tr>
                                            <tr><td>depth copy state</td><td>the end-renderpass to queue-submit handoff and the copy ring</td></tr>
                                            <tr><td>m3 theme</td><td>colour maths, token parsing, export, motion springs, geometry</td></tr>
                                            <tr><td>variable font</td><td>axes, outlines, and advances in the patched font path</td></tr>
                                            <tr><td>signal chaining</td><td>the layer's handlers chain to handlers that were already installed</td></tr>
                                            <tr><td>x11 input handoff</td><td>grab transitions, held keys and buttons, cursor capture</td></tr>
                                            <tr><td>wayland syncobj gate</td><td>hold and release ordering for explicit-sync commits</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p>
                                    The shader check runs the embedded compiler over every shader in the package
                                    list. The built-in check does the same for <code>assets/builtInShaders</code>.
                                    Neither needs a GPU. The vkcube smoke test also asserts that an effect built a
                                    render pass and that a depth attachment was seen, so a silent pass-through
                                    fails. It cannot cover the real depth path on a runner without a GPU.
                                </p>
                                <p>
                                    CI does not publish anything. Every release is a manual dispatch.
                                </p>
                            </section>

                            <section className="vk-docs-section" id="releases">
                                <div className="vk-docs-section-head">
                                    <span>12</span>
                                    <h2>Releases</h2>
                                </div>
                                <p>
                                    <code>.github/workflows/release.yml</code> is manual. There's no release
                                    train; someone runs it when a build is ready. It takes a full 40-character
                                    commit SHA, a version without the <code>v</code>, optional earlier run IDs
                                    whose artifacts should be reused, and a toggle for each package family.
                                </p>
                                <p>
                                    Before any build starts, the validate job checks that the SHA matches the
                                    checkout, the version parses, the tag does not already exist, at least one
                                    build is selected or a reuse run is given, and <code>VERSION</code> exactly
                                    equals the tag. It also requires a non-empty release notes file at{' '}
                                    <code>docs/releases/&lt;version&gt;.md</code>.
                                </p>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>package</th><th>architectures</th><th>format</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>Arch</td><td>x86_64, aarch64 (emulated)</td><td><code>.pkg.tar.zst</code></td></tr>
                                            <tr><td>Fedora and openSUSE RPM</td><td>x86_64, aarch64</td><td><code>.rpm</code></td></tr>
                                            <tr><td>Debian</td><td>x86_64, aarch64 (emulated)</td><td><code>.deb</code></td></tr>
                                            <tr><td>Flatpak</td><td>x86_64, aarch64</td><td><code>.flatpak</code></td></tr>
                                            <tr><td>Nix</td><td>x86_64, aarch64</td><td><code>.tar.xz</code></td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p>
                                    The publish job downloads the chosen artifacts, checks every expected filename,
                                    then creates the GitHub release with <code>gh release create</code>, targeting
                                    the requested commit and using the notes file. A rerun can reuse artifacts from
                                    earlier runs, but the release still validates the complete set before
                                    publishing.
                                </p>
                                <Callout kind="caution">
                                    <p>
                                        The workflow uses <code>RELEASE_TOKEN</code> when configured, falling
                                        back to the default token. The built-in token cannot create tags or
                                        releases for a commit that touched workflow files.
                                    </p>
                                    <p>
                                        ARM64 builds might not even build properly yet, not for all distros.
                                    </p>
                                </Callout>
                            </section>

                            <section className="vk-docs-section" id="versioning">
                                <div className="vk-docs-section-head">
                                    <span>13</span>
                                    <h2>Versioning</h2>
                                </div>
                                <p>
                                    <code>VERSION</code> at the repository root is the source of truth. It holds
                                    the full tag, including the <code>v</code>, for example{' '}
                                    <code>v0.2.2-preview.1</code>. Meson compiles that string into the library, so
                                    the About tab reports the build it is actually running.
                                </p>
                                <p>
                                    Tags follow <code>vX.Y.Z</code> for a stable release and{' '}
                                    <code>vX.Y.Z-preview.N</code> for a preview. The tag keeps the machine form.
                                    The release title spells a preview out, so <code>v0.2.2-preview.1</code>
                                    becomes <code>VKIntox v0.2.2 Preview 1</code>. Package versions replace the
                                    hyphen with an underscore where the package manager forbids it, which is why
                                    Arch and RPM artifacts read <code>0.2.2_preview.1</code>.
                                </p>
                                <p>
                                    Release notes live in <code>docs/releases/</code> and are required. To ship a
                                    version: bump <code>VERSION</code>, write the notes file, commit, push, then
                                    dispatch the release workflow with that commit and version. A tag is never
                                    reused. If a release needs to be redone, delete the tag first.
                                </p>
                            </section>

                            <section className="vk-docs-section" id="backend">
                                <div className="vk-docs-section-head">
                                    <span>14</span>
                                    <h2>Backend and architecture</h2>
                                </div>
                                <p>
                                    The layer is written in C++20, with external C entry surfaces. It wraps{' '}
                                    <code>vkGetInstanceProcAddr</code> and <code>vkGetDeviceProcAddr</code>,
                                    tracks instances, devices and swapchains, owns its images, render passes,
                                    command buffers and generally pipelines, around the game's. The game is
                                    never directly affected.
                                </p>
                                <p>
                                    Every Vulkan handle is wrapped in the RAII type, and teardown goes through
                                    a central destroy queue that is deferred. Views release memory before the
                                    images they read, device memory is released last. There's a unit test for
                                    this specifically.
                                </p>
                                <p>
                                    Depth has a dedicated copy state: render pass and queue submits happen on
                                    a separate background thread, keeping the depth image alive until the
                                    copy is consumed. Effects are held in a registry, using the embedded
                                    compiler, and save to cache, for speed.
                                </p>
                                <p>
                                    Config serialization has per-game profiles and a separate hidden file for
                                    parameters of the effects you've disabled. ReShade <code>.ini</code>{' '}
                                    profiles are supported, and behave similarly. For saving, note that
                                    disabled effects' parameters <em>do not</em> save and duplicated effects
                                    might behave otherwise between configs and/or transferring to ReShade.
                                </p>
                                <p>
                                    Input works on both X11 and Wayland. VKIntox also uses GIO for file picker
                                    integration.
                                </p>
                                <p>
                                    The in-game overlay uses a direct fork of ImGui that has a from-scratch
                                    implementation of Material 3. Also features background blur.
                                </p>
                                <p>
                                    The layer also has a HUD protection path (FX-Over-UI?). When available,
                                    the effects get fed an HUD-free scene, and effects draw under the HUD.
                                    This may cause some flickering. Code assumes Roblox's render pathway, but
                                    doesn't necessarily fire when the game is likely unsupported.
                                </p>
                            </section>

                            <section className="vk-docs-section" id="third-party">
                                <div className="vk-docs-section-head">
                                    <span>15</span>
                                    <h2>Third-party components</h2>
                                </div>
                                <div className="vk-docs-table-wrap">
                                    <table>
                                        <thead>
                                            <tr><th>component</th><th>what it provides</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>vkBasalt and vkShade</td><td>the base layer architecture and inherited rendering code</td></tr>
                                            <tr><td>vkBasalt_overlay and vkDaedalus</td><td>the Wayland overlay and input groundwork</td></tr>
                                            <tr><td>ReShade</td><td>the reshadefx compiler, effect parser, and SPIR-V code generation</td></tr>
                                            <tr><td>Dear ImGui</td><td>the immediate-mode UI core, forked as <code>imgui-material-3</code></td></tr>
                                            <tr><td>VKIntoxEffects</td><td>built-in shaders: IntoxSSR, IntoxMXAO, IntoxDepthColorCorrection, MSAA, ExponentialFog, IntoxRimlight</td></tr>
                                            <tr><td>Google Sans Flex, Roboto Flex, Material Symbols</td><td>the interface fonts</td></tr>
                                            <tr><td>stb_image and stb_image_resize</td><td>texture loading and resizing</td></tr>
                                            <tr><td>glslang and SPIRV-Headers</td><td>build-time compilation of the layer's own GLSL</td></tr>
                                            <tr><td>Vulkan, X11, Wayland, xkbcommon, GIO</td><td>platform and window-system interfaces</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p>
                                    Original VKIntox code is licensed under GPL-3.0-or-later. Code inherited from
                                    vkBasalt, vkBasalt_overlay, and vkDaedalus stays under the Zlib licence, and
                                    modified inherited code falls under the GPL. Submodules and shader packages
                                    keep their own licences. The redistributed licence texts install under{' '}
                                    <code>share/licenses/vkintox</code>.
                                </p>
                            </section>

                            <section className="vk-docs-section" id="troubleshooting">
                                <div className="vk-docs-section-head">
                                    <span>16</span>
                                    <h2>Troubleshooting</h2>
                                </div>
                                <p>
                                    Raising the log level to debug does a lot of help, as it shows more
                                    information:
                                </p>
                                <CopyBlock code={LOG} label="debug log" />
                                <ul>
                                    <li>Effects off at launch usually means a shader failed to compile. This can happen when you reinstall the ReShade effects, where you'd need to refresh paths inside the Shader Manager, and optionally compile-test what you have. Then, delete the ghost effect and re-apply it.</li>
                                    <li>Wrong depth orientation: try messing around with Invert/Flip/Mirror and switch between View Space Z and Red/Luminance.</li>
                                    <li>Still wrong? Try pinning a depth buffer manually.</li>
                                    <li>Flatpak app ignores the layer / update didn't apply: ensure your app uses the 26.08 branch of the FreeDesktop Runtime, run <code>flatpak update</code>, and for updates, reboot.</li>
                                    <li>Input leaks into the game: this could be a game-specific issue. Note that <strong>only</strong> mouse blocking functions, whereas keyboard input still goes through.</li>
                                    <li>Wine/Proton games are not widely tested, but are considered working well enough. Be careful when using VKIntox with anti-cheat games (whether it be Wine or not), the responsibility is on you. However, no ban has been recorded yet.</li>
                                </ul>
                                <Callout kind="key" label="reporting issues">
                                    For opening issues, please include your <strong>debug</strong> logs and a
                                    frame dump. This is usually enough. More information may be required,
                                    such as your GPU, Linux Distro, CPU architecture (...arm64 is
                                    experimental) and etc...
                                </Callout>
                            </section>

                            <div className="vk-docs-feedback">
                                <span>Something wrong on this page?</span>
                                <a href="https://github.com/buwryme/buwryy.net/issues/new/choose" target="_blank" rel="noopener">
                                    open an issue
                                </a>
                            </div>
                        </article>

                        <aside className="vk-docs-toc">
                            <p className="vk-docs-toc-title">On this page</p>
                            <nav aria-label="On this page">
                                {SECTIONS.map((section) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className={active === section.id ? 'is-active' : ''}
                                        aria-current={active === section.id ? 'location' : undefined}
                                    >
                                        {section.title}
                                    </a>
                                ))}
                            </nav>
                            <div className="vk-docs-toc-pager">
                                {previousSection ? (
                                    <a href={`#${previousSection.id}`}>
                                        <span>← previous</span>
                                        <strong>{previousSection.title}</strong>
                                    </a>
                                ) : <span />}
                                {nextSection && (
                                    <a href={`#${nextSection.id}`} className="is-next">
                                        <span>next →</span>
                                        <strong>{nextSection.title}</strong>
                                    </a>
                                )}
                            </div>
                        </aside>
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
