import { useEffect, useRef, useState } from 'react';
import { VERT, NORMAL_FRAG, AO_FRAG, AO_BLUR_FRAG, SSR_FRAG, SSR_BLUR_FRAG, FINAL_FRAG } from '../lib/vkEffectsShaders';
import './EffectsPlayground.css';

type EffectKey = 'mxao' | 'ssr' | 'dcc' | 'msaa' | 'sharpen' | 'clarity' | 'colour';

interface ParamDef {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
}

interface EffectDef {
    key: EffectKey;
    label: string;
    params: ParamDef[];
}

interface FxConfig {
    enabled: Record<EffectKey, boolean>;
    params: Record<string, number>;
}

const EFFECTS: EffectDef[] = [
    {
        key: 'mxao',
        label: 'MXAO',
        params: [
            { key: 'mxaoRadius', label: 'Radius', min: 0.5, max: 20, step: 0.1 },
            { key: 'mxaoAmount', label: 'Amount', min: 0, max: 4, step: 0.05 },
            { key: 'mxaoBias', label: 'Bias', min: 0, max: 0.5, step: 0.001 },
        ],
    },
    {
        key: 'ssr',
        label: 'SSR',
        params: [
            { key: 'ssrStrength', label: 'Strength', min: 0, max: 1, step: 0.01 },
            { key: 'ssrFresnel', label: 'Fresnel', min: 1, max: 10, step: 0.01 },
            { key: 'ssrGrowth', label: 'Ray Growth', min: 1.2, max: 4, step: 0.05 },
            { key: 'ssrBlur', label: 'Blur', min: 0, max: 12, step: 0.1 },
            { key: 'ssrError', label: 'Error Smoothing', min: 0, max: 4, step: 0.05 },
        ],
    },
    {
        key: 'dcc',
        label: 'DepthColorCorrection',
        params: [
            { key: 'dccNearExposure', label: 'Near exposure', min: -2, max: 2, step: 0.01 },
            { key: 'dccNearBrightness', label: 'Near brightness', min: -0.5, max: 0.5, step: 0.01 },
            { key: 'dccNearContrast', label: 'Near contrast', min: 0.5, max: 1.5, step: 0.01 },
            { key: 'dccNearSaturation', label: 'Near saturation', min: 0, max: 2, step: 0.01 },
            { key: 'dccNearTemperature', label: 'Near temperature', min: -1, max: 1, step: 0.01 },
            { key: 'dccNearTint', label: 'Near tint', min: -1, max: 1, step: 0.01 },
            { key: 'dccFarExposure', label: 'Far exposure', min: -2, max: 2, step: 0.01 },
            { key: 'dccFarBrightness', label: 'Far brightness', min: -0.5, max: 0.5, step: 0.01 },
            { key: 'dccFarContrast', label: 'Far contrast', min: 0.5, max: 1.5, step: 0.01 },
            { key: 'dccFarSaturation', label: 'Far saturation', min: 0, max: 2, step: 0.01 },
            { key: 'dccFarTemperature', label: 'Far temperature', min: -1, max: 1, step: 0.01 },
            { key: 'dccFarTint', label: 'Far tint', min: -1, max: 1, step: 0.01 },
        ],
    },
    {
        key: 'msaa',
        label: 'MSAA',
        params: [
            { key: 'msaaThreshold', label: 'Edge threshold', min: 0.02, max: 0.5, step: 0.01 },
            { key: 'msaaStrength', label: 'Blend strength', min: 0.05, max: 1, step: 0.01 },
        ],
    },
    {
        key: 'sharpen',
        label: 'FastSharpen',
        params: [
            { key: 'sharpenSharpen', label: 'Sharpen', min: 0, max: 4, step: 0.01 },
            { key: 'sharpenDetails', label: 'Details', min: 0, max: 1, step: 0.01 },
            { key: 'sharpenContrast', label: 'Contrast', min: 0, max: 0.2, step: 0.001 },
        ],
    },
    {
        key: 'clarity',
        label: 'Clarity',
        params: [
            { key: 'clarityStrength', label: 'Strength', min: 0, max: 1, step: 0.01 },
            { key: 'clarityRadius', label: 'Radius (px)', min: 0.1, max: 24, step: 0.1 },
        ],
    },
    {
        key: 'colour',
        label: 'Colourfulness',
        params: [
            { key: 'colourAmount', label: 'Amount', min: 0, max: 1, step: 0.01 },
        ],
    },
];

// defaults from ~/.config/VKIntox/configs/shaders/ReShadePreset.ini
// defaults mirrored from the live playground config
const DEFAULT_ENABLED = {
    mxao: true,
    ssr: true,
    dcc: true,
    msaa: true,
    sharpen: true,
    clarity: true,
    colour: true,
} as Record<EffectKey, boolean>;

const DEFAULT_PARAMS: Record<string, number> = {
    mxaoRadius: 4,
    mxaoAmount: 4,
    mxaoBias: 0.5,
    ssrStrength: 0.5,
    ssrFresnel: 2.26,
    ssrGrowth: 4,
    ssrBlur: 0,
    ssrError: 1.15,
    dccTransition: 0.45,
    dccNearExposure: 0.28,
    dccNearBrightness: 0.27,
    dccNearContrast: 0.5,
    dccNearSaturation: 0.98,
    dccNearTemperature: -0.48,
    dccNearTint: 0.35,
    dccFarExposure: -0.14,
    dccFarBrightness: 0.13,
    dccFarContrast: 1.28,
    dccFarSaturation: 0.38,
    dccFarTemperature: -0.42,
    dccFarTint: -0.03,
    msaaThreshold: 0.1,
    msaaStrength: 1,
    sharpenSharpen: 0.28,
    sharpenDetails: 0.2,
    sharpenContrast: 0,
    clarityStrength: 0.15,
    clarityRadius: 4.7,
    colourAmount: 0.4,
};

const STORAGE_KEY = 'vkintox-effects-config-v1';
const DEBUG_FX = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('fx')
    : null;
const DEBUG_VIEW = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('debug')
    : null;

const defaultConfig = (): FxConfig => ({
    enabled: { ...DEFAULT_ENABLED },
    params: { ...DEFAULT_PARAMS },
});

function loadConfig(): FxConfig
{
    const base = defaultConfig();

    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw)
        {
            const saved = JSON.parse(raw) as Partial<FxConfig>;
            if (saved.enabled)
            {
                (Object.keys(base.enabled) as EffectKey[]).forEach((key) => {
                    if (typeof saved.enabled?.[key] === 'boolean')
                        base.enabled[key] = saved.enabled[key] as boolean;
                });
            }
            if (saved.params)
            {
                Object.keys(base.params).forEach((key) => {
                    const value = saved.params?.[key];
                    if (typeof value === 'number' && Number.isFinite(value))
                        base.params[key] = value;
                });
            }
        }
    }
    catch
    {
        // corrupt storage just falls back to the defaults
    }

    if (DEBUG_FX)
    {
        if (DEBUG_FX === 'none')
        {
            (Object.keys(base.enabled) as EffectKey[]).forEach((key) => { base.enabled[key] = false; });
        }
        else if (DEBUG_FX === 'all')
        {
            (Object.keys(base.enabled) as EffectKey[]).forEach((key) => { base.enabled[key] = true; });
        }
        else
        {
            const only = DEBUG_FX.split(',');
            (Object.keys(base.enabled) as EffectKey[]).forEach((key) => {
                base.enabled[key] = only.includes(key);
            });
        }
    }

    return base;
}

const FINAL_TOGGLES: Record<EffectKey, string> = {
    mxao: 'uMXAOOn',
    ssr: 'uSSROn',
    dcc: 'uDCCOn',
    msaa: 'uMSAAOn',
    sharpen: 'uSharpenOn',
    clarity: 'uClarityOn',
    colour: 'uColourOn',
};

const AO_PARAMS = ['mxaoRadius', 'mxaoAmount', 'mxaoBias'];
const SSR_PARAMS = ['ssrStrength', 'ssrFresnel', 'ssrGrowth', 'ssrBlur', 'ssrError'];

const FINAL_PARAMS = [
    'mxaoAmount',
    'dccTransition',
    'dccNearExposure', 'dccNearBrightness', 'dccNearContrast',
    'dccNearSaturation', 'dccNearTemperature', 'dccNearTint',
    'dccFarExposure', 'dccFarBrightness', 'dccFarContrast',
    'dccFarSaturation', 'dccFarTemperature', 'dccFarTint',
    'msaaThreshold', 'msaaStrength',
    'sharpenSharpen', 'sharpenDetails', 'sharpenContrast',
    'clarityStrength', 'clarityRadius',
    'colourAmount',
];

const uniformName = (key: string) => 'u' + key.charAt(0).toUpperCase() + key.slice(1);

const formatValue = (value: number, step: number) => {
    if (step >= 1) return String(Math.round(value));
    const decimals = step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
    return value.toFixed(decimals);
};

interface Renderer {
    render: (config: FxConfig) => void;
}

export default function EffectsPlayground()
{
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const compareRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<Renderer | null>(null);
    const configRef = useRef<FxConfig | null>(null);

    const [config, setConfig] = useState<FxConfig>(loadConfig);
    const [openKey, setOpenKey] = useState<EffectKey | null>(() => {
        const requested = new URLSearchParams(window.location.search).get('open');
        return EFFECTS.some((effect) => effect.key === requested) ? requested as EffectKey : null;
    });
    const [ready, setReady] = useState(false);

    if (configRef.current === null)
        configRef.current = config;

    const activeCount = EFFECTS.reduce((total, effect) => total + (config.enabled[effect.key] ? 1 : 0), 0);

    useEffect(() => {
        configRef.current = config;
        rendererRef.current?.render(config);

        if (!DEBUG_FX)
        {
            try
            {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            }
            catch
            {
                // storage full or blocked: the settings simply won't persist
            }
        }
    }, [config]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
        if (!gl) return;

        let disposed = false;
        const textures: WebGLTexture[] = [];
        const buffers: WebGLBuffer[] = [];
        const programs: WebGLProgram[] = [];

        interface Target {
            texture: WebGLTexture;
            framebuffer: WebGLFramebuffer;
            width: number;
            height: number;
        }

        let normalTarget: Target | null = null;
        let aoTarget: Target | null = null;
        let aoBlurTarget: Target | null = null;
        let ssrTarget: Target | null = null;
        let ssrBlurTarget: Target | null = null;
        let pixelRatio = 1;
        let sceneTexture: WebGLTexture | null = null;
        let depthTexture: WebGLTexture | null = null;
        let depthSize = { width: 1550, height: 1000 };

        const compile = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const link = (fragmentSource: string) => {
            const vs = compile(gl.VERTEX_SHADER, VERT);
            const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
            if (!vs || !fs)
            {
                if (vs) gl.deleteShader(vs);
                if (fs) gl.deleteShader(fs);
                return null;
            }
            const program = gl.createProgram();
            if (!program) return null;
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            {
                console.error(gl.getProgramInfoLog(program));
                return null;
            }
            programs.push(program);
            return program;
        };

        const normalProgram = link(NORMAL_FRAG);
        const aoProgram = link(AO_FRAG);
        const aoBlurProgram = link(AO_BLUR_FRAG);
        const ssrProgram = link(SSR_FRAG);
        const ssrBlurProgram = link(SSR_BLUR_FRAG);
        const finalProgram = link(FINAL_FRAG);
        if (!normalProgram || !aoProgram || !aoBlurProgram || !ssrProgram || !ssrBlurProgram || !finalProgram) return;

        const U = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);

        const normalU = {
            uDepth: U(normalProgram, 'uDepth'),
            uRes: U(normalProgram, 'uRes'),
            uDepthSize: U(normalProgram, 'uDepthSize'),
        };

        const aoU = {
            uDepth: U(aoProgram, 'uDepth'),
            uNormals: U(aoProgram, 'uNormals'),
            uRes: U(aoProgram, 'uRes'),
            uDepthSize: U(aoProgram, 'uDepthSize'),
            uAspect: U(aoProgram, 'uAspect'),
            uMxaoRadius: U(aoProgram, 'uMxaoRadius'),
            uMxaoBias: U(aoProgram, 'uMxaoBias'),
        };

        const aoBlurU = {
            uAO: U(aoBlurProgram, 'uAO'),
            uNormals: U(aoBlurProgram, 'uNormals'),
            uRes: U(aoBlurProgram, 'uRes'),
            uRadius: U(aoBlurProgram, 'uRadius'),
            uSteps: U(aoBlurProgram, 'uSteps'),
        };

        const ssrBlurU = {
            uInput: U(ssrBlurProgram, 'uInput'),
            uNormals: U(ssrBlurProgram, 'uNormals'),
            uRes: U(ssrBlurProgram, 'uRes'),
            uDir: U(ssrBlurProgram, 'uDir'),
            uRadius: U(ssrBlurProgram, 'uRadius'),
            uSmoothen: U(ssrBlurProgram, 'uSmoothen'),
            uErrorIntensity: U(ssrBlurProgram, 'uErrorIntensity'),
            uErrorSensitivity: U(ssrBlurProgram, 'uErrorSensitivity'),
        };

        const ssrU = {
            uTex: U(ssrProgram, 'uTex'),
            uDepth: U(ssrProgram, 'uDepth'),
            uNormals: U(ssrProgram, 'uNormals'),
            uRes: U(ssrProgram, 'uRes'),
            uDepthSize: U(ssrProgram, 'uDepthSize'),
            uAspect: U(ssrProgram, 'uAspect'),
            uSsrStrength: U(ssrProgram, 'uSsrStrength'),
            uSsrFresnel: U(ssrProgram, 'uSsrFresnel'),
            uSsrFade: U(ssrProgram, 'uSsrFade'),
            uSsrGrowth: U(ssrProgram, 'uSsrGrowth'),
        };

        const finalU: Record<string, WebGLUniformLocation | null> = {
            uTex: U(finalProgram, 'uTex'),
            uDepth: U(finalProgram, 'uDepth'),
            uAOTex: U(finalProgram, 'uAOTex'),
            uNormalsTex: U(finalProgram, 'uNormalsTex'),
            uMxaoAmount: U(finalProgram, 'uMxaoAmount'),
            uSsrFade: U(finalProgram, 'uSsrFade'),
            uSsrGlobalRadius: U(finalProgram, 'uSsrGlobalRadius'),
            uSSRTex: U(finalProgram, 'uSSRTex'),
            uRes: U(finalProgram, 'uRes'),
            uPxScale: U(finalProgram, 'uPxScale'),
            uDebugSSR: U(finalProgram, 'uDebugSSR'),
            uDebugAO: U(finalProgram, 'uDebugAO'),
        };
        Object.values(FINAL_TOGGLES).forEach((name) => {
            finalU[name] = U(finalProgram, name);
        });
        FINAL_PARAMS.forEach((key) => {
            const name = uniformName(key);
            finalU[name] = U(finalProgram, name);
        });

        const quad = gl.createBuffer();
        if (!quad) return;
        buffers.push(quad);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        const attrib = new Map<WebGLProgram, number>();
        [normalProgram, aoProgram, aoBlurProgram, ssrProgram, ssrBlurProgram, finalProgram].forEach((program) => {
            attrib.set(program, gl.getAttribLocation(program, 'aPos'));
        });

        const prepare = (program: WebGLProgram) => {
            const location = attrib.get(program);
            if (location === undefined || location < 0) return;
            gl.bindBuffer(gl.ARRAY_BUFFER, quad);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        };

        const makePixel = (r: number, g: number, b: number, a: number) => {
            const texture = gl.createTexture();
            if (!texture) return null;
            textures.push(texture);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r, g, b, a]));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            return texture;
        };

        const whitePixel = makePixel(255, 255, 255, 255);
        const blackPixel = makePixel(0, 0, 0, 255);

        const destroyTarget = (target: Target | null) => {
            if (!target) return;
            gl.deleteTexture(target.texture);
            gl.deleteFramebuffer(target.framebuffer);
        };

        const createTarget = (width: number, height: number): Target | null => {
            const texture = gl.createTexture();
            const framebuffer = gl.createFramebuffer();
            if (!texture || !framebuffer) return null;

            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            if (status !== gl.FRAMEBUFFER_COMPLETE)
            {
                console.error('effect framebuffer incomplete', status);
                gl.deleteTexture(texture);
                gl.deleteFramebuffer(framebuffer);
                return null;
            }

            return { texture, framebuffer, width, height };
        };

        const loadTexture = (image: HTMLImageElement, nearest = false) => {
            const texture = gl.createTexture();
            if (!texture) return null;
            textures.push(texture);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
            return texture;
        };

        const resizeTargets = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return false;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.round(rect.width * dpr);
            const height = Math.round(rect.height * dpr);

            if (canvas.width !== width || canvas.height !== height)
            {
                canvas.width = width;
                canvas.height = height;
            }
            pixelRatio = dpr;

            if (!normalTarget || normalTarget.width !== width || normalTarget.height !== height)
            {
                destroyTarget(normalTarget);
                normalTarget = createTarget(width, height);
            }
            if (!aoTarget || aoTarget.width !== width || aoTarget.height !== height)
            {
                destroyTarget(aoTarget);
                aoTarget = createTarget(width, height);
            }

            if (!aoBlurTarget || aoBlurTarget.width !== width || aoBlurTarget.height !== height)
            {
                destroyTarget(aoBlurTarget);
                aoBlurTarget = createTarget(width, height);
            }

            // SSR renders at twice the canvas and is downsampled by the final
            // pass; MXAO stays at 1:1
            const ssrWidth = Math.max(2, width * 2);
            const ssrHeight = Math.max(2, height * 2);
            if (!ssrTarget || ssrTarget.width !== ssrWidth || ssrTarget.height !== ssrHeight)
            {
                destroyTarget(ssrTarget);
                ssrTarget = createTarget(ssrWidth, ssrHeight);
            }
            if (!ssrBlurTarget || ssrBlurTarget.width !== ssrWidth || ssrBlurTarget.height !== ssrHeight)
            {
                destroyTarget(ssrBlurTarget);
                ssrBlurTarget = createTarget(ssrWidth, ssrHeight);
            }

            return !!normalTarget && !!aoTarget && !!aoBlurTarget && !!ssrTarget && !!ssrBlurTarget;
        };

        const draw = (next: FxConfig) => {
            if (disposed || !sceneTexture || !depthTexture) return;
            if (!resizeTargets() || !normalTarget || !aoTarget || !aoBlurTarget || !ssrTarget || !ssrBlurTarget) return;

            const width = canvas.width;
            const height = canvas.height;
            const aspect = width / height;

            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);
            gl.disable(gl.CULL_FACE);

            if (next.enabled.mxao || next.enabled.ssr)
            {
                // normal pass, PS_SetupInputs
                gl.bindFramebuffer(gl.FRAMEBUFFER, normalTarget.framebuffer);
                gl.viewport(0, 0, normalTarget.width, normalTarget.height);
                gl.useProgram(normalProgram);
                prepare(normalProgram);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, depthTexture);
                gl.uniform1i(normalU.uDepth, 0);
                gl.uniform2f(normalU.uRes, normalTarget.width, normalTarget.height);
                gl.uniform2f(normalU.uDepthSize, depthSize.width, depthSize.height);
                gl.drawArrays(gl.TRIANGLES, 0, 3);

                if (next.enabled.mxao)
                {
                // obscurance pass, PS_Obscurance
                gl.bindFramebuffer(gl.FRAMEBUFFER, aoTarget.framebuffer);
                gl.viewport(0, 0, aoTarget.width, aoTarget.height);
                gl.useProgram(aoProgram);
                prepare(aoProgram);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, normalTarget.texture);
                gl.uniform1i(aoU.uNormals, 0);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, depthTexture);
                gl.uniform1i(aoU.uDepth, 1);
                gl.uniform2f(aoU.uRes, aoTarget.width, aoTarget.height);
                gl.uniform2f(aoU.uDepthSize, depthSize.width, depthSize.height);
                gl.uniform1f(aoU.uAspect, aspect);
                gl.uniform1f(aoU.uMxaoRadius, next.params.mxaoRadius);
                gl.uniform1f(aoU.uMxaoBias, next.params.mxaoBias);
                gl.drawArrays(gl.TRIANGLES, 0, 3);

                // first spatial filter, MXAOBlur(blursteps = 4)
                gl.useProgram(aoBlurProgram);
                prepare(aoBlurProgram);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, aoTarget.texture);
                gl.uniform1i(aoBlurU.uAO, 0);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, normalTarget.texture);
                gl.uniform1i(aoBlurU.uNormals, 1);
                gl.bindFramebuffer(gl.FRAMEBUFFER, aoBlurTarget.framebuffer);
                gl.viewport(0, 0, aoBlurTarget.width, aoBlurTarget.height);
                gl.uniform2f(aoBlurU.uRes, aoBlurTarget.width, aoBlurTarget.height);
                gl.uniform1f(aoBlurU.uRadius, 0.75);
                gl.uniform1f(aoBlurU.uSteps, 4.0);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                }
            }

            if (next.enabled.ssr)
            {
                gl.bindFramebuffer(gl.FRAMEBUFFER, ssrTarget.framebuffer);
                gl.viewport(0, 0, ssrTarget.width, ssrTarget.height);
                gl.useProgram(ssrProgram);
                prepare(ssrProgram);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
                gl.uniform1i(ssrU.uTex, 0);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, depthTexture);
                gl.uniform1i(ssrU.uDepth, 1);
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, normalTarget.texture);
                gl.uniform1i(ssrU.uNormals, 2);
                gl.uniform2f(ssrU.uRes, ssrTarget.width, ssrTarget.height);
                gl.uniform2f(ssrU.uDepthSize, depthSize.width, depthSize.height);
                gl.uniform1f(ssrU.uSsrStrength, next.params.ssrStrength);
                gl.uniform1f(ssrU.uSsrFresnel, next.params.ssrFresnel);
                                gl.uniform1f(ssrU.uSsrGrowth, next.params.ssrGrowth);
                gl.drawArrays(gl.TRIANGLES, 0, 3);

                // horizontal then vertical, mask from the normal buffer
                for (let pass = 0; pass < 2; pass++)
                {
                    const source = pass === 0 ? ssrTarget : ssrBlurTarget;
                    const target = pass === 0 ? ssrBlurTarget : ssrTarget;
                    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
                    gl.viewport(0, 0, target.width, target.height);
                    gl.useProgram(ssrBlurProgram);
                    prepare(ssrBlurProgram);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, source.texture);
                    gl.uniform1i(ssrBlurU.uInput, 0);
                    gl.activeTexture(gl.TEXTURE1);
                    gl.bindTexture(gl.TEXTURE_2D, normalTarget.texture);
                    gl.uniform1i(ssrBlurU.uNormals, 1);
                    gl.uniform2f(ssrBlurU.uRes, target.width, target.height);
                    gl.uniform2f(ssrBlurU.uDir, pass === 0 ? 1.0 : 0.0, pass === 0 ? 0.0 : 1.0);
                    gl.uniform1f(ssrBlurU.uRadius, next.params.ssrBlur);
                    gl.uniform1f(ssrBlurU.uSmoothen, 0.0);
                    gl.uniform1f(ssrBlurU.uErrorIntensity, next.params.ssrError);
                    gl.uniform1f(ssrBlurU.uErrorSensitivity, 0.0);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                }
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, width, height);
            gl.useProgram(finalProgram);
            prepare(finalProgram);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
            gl.uniform1i(finalU.uTex, 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, depthTexture);
            gl.uniform1i(finalU.uDepth, 1);

            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, next.enabled.mxao ? aoBlurTarget.texture : whitePixel);
            gl.uniform1i(finalU.uAOTex, 2);

            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, next.enabled.mxao ? normalTarget.texture : whitePixel);
            gl.uniform1i(finalU.uNormalsTex, 4);

            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, next.enabled.ssr ? ssrTarget.texture : blackPixel);
            gl.uniform1i(finalU.uSSRTex, 3);

            gl.uniform2f(finalU.uRes, width, height);
            gl.uniform1f(finalU.uPxScale, pixelRatio);
            gl.uniform1f(finalU.uSsrGlobalRadius, 0.0);
            gl.uniform1f(finalU.uDebugSSR, DEBUG_VIEW === 'ssr' ? 1 : DEBUG_VIEW === 'alpha' ? 2 : 0);
            gl.uniform1f(finalU.uDebugAO, DEBUG_VIEW === 'ao' ? 1 : DEBUG_VIEW === 'aonorm' ? 2 : 0);

            (Object.keys(FINAL_TOGGLES) as EffectKey[]).forEach((key) => {
                gl.uniform1f(finalU[FINAL_TOGGLES[key]], next.enabled[key] ? 1 : 0);
            });
            FINAL_PARAMS.forEach((key) => {
                const location = finalU[uniformName(key)];
                // VKIntox's own MXAO reads about 5x stronger at the same slider
                // value, and its colour transition reads 3x wider
                let value = next.params[key];
                if (key === 'mxaoAmount') value *= 5;
                else if (key === 'dccTransition') value *= 3;
                if (location) gl.uniform1f(location, value);
            });

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        rendererRef.current = { render: draw };

        const sceneImage = new Image();
        const depthImage = new Image();
        let loaded = 0;

        const onLoad = () => {
            loaded++;
            if (loaded < 2 || disposed) return;
            sceneTexture = loadTexture(sceneImage);
            depthTexture = loadTexture(depthImage, true);
            depthSize = {
                width: depthImage.naturalWidth || 1550,
                height: depthImage.naturalHeight || 1000,
            };
            setReady(true);
            if (configRef.current) draw(configRef.current);
        };

        sceneImage.onload = onLoad;
        depthImage.onload = onLoad;
        sceneImage.src = '/assets/vkintox-backbuffer.png';
        depthImage.src = '/assets/vkintox-depth.png';

        const observer = new ResizeObserver(() => {
            if (configRef.current) draw(configRef.current);
        });
        observer.observe(canvas);

        return () => {
            disposed = true;
            observer.disconnect();
            rendererRef.current = null;
            destroyTarget(normalTarget);
            destroyTarget(aoTarget);
            destroyTarget(aoBlurTarget);
            destroyTarget(ssrTarget);
            destroyTarget(ssrBlurTarget);
            textures.forEach((texture) => gl.deleteTexture(texture));
            buffers.forEach((buffer) => gl.deleteBuffer(buffer));
            programs.forEach((program) => gl.deleteProgram(program));
        };
    }, []);

    const setSplit = (percent: number) => {
        const element = compareRef.current;
        if (!element) return;
        const clamped = Math.min(100, Math.max(0, percent));
        element.style.setProperty('--split', `${clamped}%`);
        element.setAttribute('aria-valuenow', String(Math.round(clamped)));
    };

    const splitFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
        const element = compareRef.current;
        if (!element) return 31;
        const rect = element.getBoundingClientRect();
        return ((event.clientX - rect.left) / rect.width) * 100;
    };

    const draggingRef = useRef(false);

    const updateParam = (key: string, value: number) => {
        setConfig((previous) => ({
            ...previous,
            params: { ...previous.params, [key]: value },
        }));
    };

    const toggleEffect = (key: EffectKey) => {
        setConfig((previous) => ({
            ...previous,
            enabled: { ...previous.enabled, [key]: !previous.enabled[key] },
        }));
    };

    const resetAll = () => {
        setConfig(defaultConfig());
        setOpenKey(null);
    };

    return (
        <div className="fxp-stage">
            <div
                className="fxp-compare"
                ref={compareRef}
                role="slider"
                tabIndex={0}
                aria-label="Compare the scene with effects off and on"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={31}
                onPointerDown={(event) => {
                    draggingRef.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    event.currentTarget.classList.add('is-dragging');
                    setSplit(splitFromEvent(event));
                }}
                onPointerMove={(event) => {
                    if (draggingRef.current) setSplit(splitFromEvent(event));
                }}
                onPointerUp={(event) => {
                    draggingRef.current = false;
                    event.currentTarget.classList.remove('is-dragging');
                }}
                onPointerCancel={(event) => {
                    draggingRef.current = false;
                    event.currentTarget.classList.remove('is-dragging');
                }}
                onKeyDown={(event) => {
                    const current = Number(compareRef.current?.getAttribute('aria-valuenow') ?? 31);
                    const step = event.shiftKey ? 10 : 2;
                    if (event.key === 'ArrowLeft') { setSplit(current - step); event.preventDefault(); }
                    if (event.key === 'ArrowRight') { setSplit(current + step); event.preventDefault(); }
                    if (event.key === 'Home') { setSplit(0); event.preventDefault(); }
                    if (event.key === 'End') { setSplit(100); event.preventDefault(); }
                }}
            >
                <img
                    className="fxp-base"
                    src="/assets/vkintox-backbuffer.png"
                    width={1550}
                    height={1000}
                    alt="Roblox scene, snowy pines at night"
                />
                <div className={`fxp-on${ready ? ' is-ready' : ''}`}>
                    <canvas ref={canvasRef} aria-hidden="true" />
                </div>
                <span className="fxp-tag fxp-tag-off">Off</span>
                <span className="fxp-tag fxp-tag-on">On</span>
                <div className="fxp-seam" />
                <div className="fxp-handle" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.5 7 4.5 12l5 5M14.5 7l5 5-5 5" />
                    </svg>
                </div>
                <span className="fxp-hint">drag to compare</span>
            </div>

            <aside className="fxp-panel" aria-label="Effects">
                <div className="fxp-panel-head">
                    <h3 className="m3-title-large">Effects</h3>
                    <span className="m3-label-medium fxp-count">{activeCount} of {EFFECTS.length} on</span>
                </div>

                <div className="fxp-scroll">
                    <ul className="fxp-switches">
                        {EFFECTS.map((effect) => {
                            const open = openKey === effect.key;
                            return (
                                <li key={effect.key} className={`fxp-item${open ? ' is-open' : ''}`}>
                                    <div className="fxp-row">
                                        <button
                                            type="button"
                                            className="fxp-expand"
                                            aria-expanded={open}
                                            onClick={() => setOpenKey(open ? null : effect.key)}
                                        >
                                            <span className="m3-label-large fxp-name">{effect.label}</span>
                                            <svg
                                                className="fxp-chevron"
                                                viewBox="0 0 24 24"
                                                width="18"
                                                height="18"
                                                aria-hidden="true"
                                            >
                                                <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>

                                        <label className="fxp-toggle">
                                            <input
                                                type="checkbox"
                                                checked={config.enabled[effect.key]}
                                                onChange={() => toggleEffect(effect.key)}
                                            />
                                            <span className="fxp-switch" aria-hidden="true" />
                                        </label>
                                    </div>

                                    {open && (
                                        <div className="fxp-params">
                                            {effect.params.map((param) => {
                                                const value = config.params[param.key];
                                                const fill = ((value - param.min) / (param.max - param.min)) * 100;
                                                return (
                                                    <label key={param.key} className="fxp-param">
                                                        <span className="fxp-param-label">{param.label}</span>
                                                        <span className="fxp-param-value">{formatValue(value, param.step)}</span>
                                                        <input
                                                            type="range"
                                                            min={param.min}
                                                            max={param.max}
                                                            step={param.step}
                                                            value={value}
                                                            style={{ '--fill': `${fill}%` } as React.CSSProperties}
                                                            onChange={(event) => updateParam(param.key, Number(event.target.value))}
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="fxp-panel-foot">
                    <button type="button" className="fxp-reset m3-label-large" onClick={resetAll}>Reset all</button>
                </div>
            </aside>
        </div>
    );
}
