// WebGL ports of VKIntox's built-in effects, using the depth buffer to
// rebuild view-space positions and normals exactly the way IntoxCommon /
// IntoxSSR / IntoxMXAO do.

export const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main()
    {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
    }
`;

const LINEARIZE = `
    #define FAR_PLANE 1000.0
    float rawDepth(vec2 uv)
    {
        vec4 t = texture2D(uDepth, clamp(uv, vec2(0.0005), vec2(0.9995)));
        return (t.r * 16711680.0 + t.g * 65280.0 + t.b * 255.0) / 16777215.0;
    }
    // IntoxCommon::linearize_depth with RESHADE_DEPTH_LINEARIZATION_FAR_PLANE
    // 1000, near 1, no log and no reversed flag - the preset's values
    float linearizeDepth(float d)
    {
        return clamp(d / (1000.0 - d * 999.0), 0.0, 1.0);
    }
    float linearDepth(vec2 uv)
    {
        return linearizeDepth(rawDepth(uv));
    }
    vec3 viewPosition(vec2 uv, float lin)
    {
        return vec3(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0, 1.0) * lin * FAR_PLANE;
    }
    vec2 screenUv(vec3 pos)
    {
        return pos.xy / pos.z * 0.5 + 0.5;
    }
    float smoothDepth(vec2 uv)
    {
        vec2 px = 1.0 / uDepthSize;
        return (linearDepth(uv) * 4.0
            + linearDepth(uv + vec2(px.x, 0.0)) + linearDepth(uv - vec2(px.x, 0.0))
            + linearDepth(uv + vec2(0.0, px.y)) + linearDepth(uv - vec2(0.0, px.y))) / 8.0;
    }
    vec3 viewNormal(vec2 uv, out float deltaz)
    {
        vec2 px = 1.0 / uDepthSize;
        vec3 position = viewPosition(uv, smoothDepth(uv));
        vec3 x1 = -position + viewPosition(uv + vec2(px.x, 0.0), smoothDepth(uv + vec2(px.x, 0.0)));
        vec3 x2 =  position - viewPosition(uv - vec2(px.x, 0.0), smoothDepth(uv - vec2(px.x, 0.0)));
        vec3 y1 = -position + viewPosition(uv + vec2(0.0, px.y), smoothDepth(uv + vec2(0.0, px.y)));
        vec3 y2 =  position - viewPosition(uv - vec2(0.0, px.y), smoothDepth(uv - vec2(0.0, px.y)));

        x1 = mix(x1, x2, step(abs(x1.z), abs(x2.z)));
        y1 = mix(y1, y2, step(abs(y1.z), abs(y2.z)));

        deltaz = abs(x1.z * x1.z - x2.z * x2.z) + abs(y1.z * y1.z - y2.z * y2.z);
        vec3 n = cross(y1, x1);
        // a skybox or any fronto-parallel patch has no depth gradient, and
        // normalize(0) is what bands the background
        float len = length(n);
        if (len < 1e-7)
        {
            deltaz = 0.0;
            return vec3(0.0, 0.0, 1.0);
        }
        return n / len;
    }
`;

/* NORMAL pass, IntoxMXAO PS_SetupInputs: view normal plus the deltaz the two
   spatial filters weight on. */
export const NORMAL_FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uDepth;
    uniform vec2 uDepthSize;
` + LINEARIZE + `
    void main()
    {
        float deltaz;
        vec3 n = viewNormal(vUv, deltaz);
        gl_FragColor = vec4(n * 0.5 + 0.5, deltaz);
    }
`;

/* IntoxMXAO PS_Obscurance with MXAO_SAMPLE_QUALITY=2 (16 samples), radius 4,
   bias 0, no indirect, no dual layer, no mips. */
export const AO_FRAG = `
    precision highp float;
    varying vec2 vUv;
    #define saturate(x) clamp(x, 0.0, 1.0)
    uniform sampler2D uDepth;
    uniform sampler2D uNormals;
    uniform vec2 uDepthSize;
    uniform vec2 uRes;
    uniform float uMxaoRadius;
    uniform float uMxaoBias;
` + LINEARIZE + `
    void main()
    {
        vec3 normal = texture2D(uNormals, vUv).xyz * 2.0 - 1.0;

        float sample_jitter = dot(floor(mod(gl_FragCoord.xy, 4.0)), vec2(0.0625, 0.25)) + 0.0625;

        vec3 position = viewPosition(vUv, linearDepth(vUv));
        float scene_depth = position.z / FAR_PLANE;
        position += normal * scene_depth;

        const int samples = 16;
        float scaled_radius = 0.25 * uMxaoRadius / (float(samples) * (position.z + 2.0));
        float falloff_factor = -1.0 / (uMxaoRadius * uMxaoRadius);

        float angle = 2.3999632 * 16.0 * sample_jitter;
        vec2 sample_dir = vec2(cos(angle), sin(angle)) * scaled_radius;

        float obscurance = 0.0;
        for (int s = 0; s < samples; s++)
        {
            vec2 tap_uv = vUv + sample_dir * vec2(1.0, uRes.x / uRes.y) * (float(s) + sample_jitter);
            sample_dir = mat2(0.76465, -0.64444, 0.64444, 0.76465) * sample_dir;

            vec3 delta_v = -position + viewPosition(tap_uv, linearDepth(tap_uv));
            float v2 = dot(delta_v, delta_v);
            float vn = dot(delta_v, normal) * inversesqrt(max(v2, 1e-9));

            obscurance += saturate(1.0 + falloff_factor * v2) * saturate(vn - uMxaoBias);
        }

        obscurance = saturate(obscurance / ((1.0 - uMxaoBias) * float(samples)) * 2.0);
        obscurance = sqrt(obscurance);
        gl_FragColor = vec4(obscurance, 0.0, 0.0, 1.0);
    }
`;

/* IntoxMXAO MXAOBlur: the same weighting both spatial filters use, with the
   radius and step count of the pass that binds it. */
export const AO_BLUR_FRAG = `
    precision highp float;
    varying vec2 vUv;
    #define saturate(x) clamp(x, 0.0, 1.0)
    uniform sampler2D uAO;
    uniform sampler2D uNormals;
    uniform vec2 uRes;
    uniform float uRadius;
    uniform float uSteps;

    void main()
    {
        vec2 px = 1.0 / uRes;

        vec3 nC = texture2D(uNormals, vUv).xyz * 2.0 - 1.0;
        float dC = texture2D(uNormals, vUv).w;
        float center = texture2D(uAO, vUv).r;

        float blursum = center;
        float blursum_noweight = center;
        float blurweight = 1.0;

        vec2 offsets[8];
        offsets[0] = vec2( 1.5,  0.5); offsets[1] = vec2(-1.5, -0.5);
        offsets[2] = vec2(-0.5,  1.5); offsets[3] = vec2( 0.5, -1.5);
        offsets[4] = vec2( 1.5,  2.5); offsets[5] = vec2(-1.5, -2.5);
        offsets[6] = vec2(-2.5,  1.5); offsets[7] = vec2( 2.5, -1.5);

        vec2 scale = px * uRadius;
        for (int s = 0; s < 8; s++)
        {
            if (float(s) >= uSteps) break;
            vec2 tap_uv = clamp(vUv + offsets[s] * scale, vec2(0.001), vec2(0.999));
            vec3 nT = texture2D(uNormals, tap_uv).xyz * 2.0 - 1.0;
            float dT = texture2D(uNormals, tap_uv).w;
            float tap = texture2D(uAO, tap_uv).r;

            float tap_weight = saturate(1.0 - abs(dT - dC)) * saturate(dot(nT, nC) * 16.0 - 15.0);
            blurweight += tap_weight;
            blursum += tap * tap_weight;
            blursum_noweight += tap;
        }

        blursum /= blurweight;
        blursum_noweight /= 1.0 + uSteps;
        gl_FragColor = vec4(mix(blursum, blursum_noweight, step(blurweight, 2.0)), 0.0, 0.0, 1.0);
    }
`;

/* IntoxSSR PS_Reflect. The ray starts on the reconstructed surface, gets an
   exponential step and up to three refinements, and the reflection is stored
   premultiplied by its alpha like the source. */
export const SSR_FRAG = `
    precision highp float;
    varying vec2 vUv;
    #define saturate(x) clamp(x, 0.0, 1.0)
    uniform sampler2D uTex;
    uniform sampler2D uDepth;
    uniform sampler2D uNormals;
    uniform vec2 uRes;
    uniform vec2 uDepthSize;
    uniform float uSsrStrength;
    uniform float uSsrFresnel;
    uniform float uSsrFade;
    uniform float uSsrGrowth;
` + LINEARIZE + `
    #define SSR_FOV 70.0
    #define SSR_ACCEPT_TOLERANCE 12.0
    #define SSR_RAY_GROWTH uSsrGrowth
    #define SSR_JITTER 1.0
    #define SSR_RELIEF_SIZE 0.1
    #define SSR_RELIEF_STRENGTH 0.03
    #define SSR_STEPS 48
    #define SSR_REFINES 3

    float tanHalf() { return tan(radians(SSR_FOV * 0.5)); }

    vec3 ssrPosition(vec2 uv)
    {
        float aspect = uRes.x / uRes.y;
        vec3 add = vec3(-tanHalf() * aspect, -tanHalf(), 1.0);
        vec3 mul = vec3(-2.0 * add.x, -2.0 * add.y, 0.0);
        return (vec3(uv, 1.0) * mul + add) * linearDepth(uv) * FAR_PLANE;
    }

    vec2 ssrScreenUv(vec3 pos)
    {
        float aspect = uRes.x / uRes.y;
        vec3 add = vec3(-tanHalf() * aspect, -tanHalf(), 1.0);
        vec3 mul = vec3(-2.0 * add.x, -2.0 * add.y, 0.0);
        return pos.xy / (mul.xy * pos.z) - add.xy / mul.xy;
    }

    float ssrBayer(vec2 vpos, int max_level)
    {
        float finalBayer = 0.0;
        float finalDivisor = 0.0;
        float layerMult = 1.0;
        for (float level = 3.0; level >= 1.0; level -= 1.0)
        {
            layerMult *= 4.0;
            vec2 coord = mod(floor(vpos * exp2(1.0 - level)), 2.0);
            float line0202 = coord.x * 2.0;
            finalBayer += mix(line0202, 3.0 - line0202, coord.y) / 3.0 * layerMult;
            finalDivisor += layerMult;
        }
        return finalBayer / finalDivisor;
    }

    void main()
    {
        vec3 nDepth = texture2D(uNormals, vUv).xyz * 2.0 - 1.0;

        vec3 position = ssrPosition(vUv);
        vec3 eyedir = normalize(position);

        // SSRReliefNormal, offset in pixels scaled by distance
        vec2 offset = 40.0 * (1.0 / uDepthSize) / max(position.z, 1e-3) * SSR_RELIEF_SIZE;
        float hpx = dot(texture2D(uTex, clamp(vUv + vec2(offset.x, 0.0), vec2(0.001), vec2(0.999))).rgb, vec3(0.333)) * 0.005 * SSR_RELIEF_STRENGTH;
        float hmx = dot(texture2D(uTex, clamp(vUv - vec2(offset.x, 0.0), vec2(0.001), vec2(0.999))).rgb, vec3(0.333)) * 0.005 * SSR_RELIEF_STRENGTH;
        float hpy = dot(texture2D(uTex, clamp(vUv + vec2(0.0, offset.y), vec2(0.001), vec2(0.999))).rgb, vec3(0.333)) * 0.005 * SSR_RELIEF_STRENGTH;
        float hmy = dot(texture2D(uTex, clamp(vUv - vec2(0.0, offset.y), vec2(0.001), vec2(0.999))).rgb, vec3(0.333)) * 0.005 * SSR_RELIEF_STRENGTH;

        float dpx = linearDepth(vUv + vec2(offset.x, 0.0));
        float dmx = linearDepth(vUv - vec2(offset.x, 0.0));
        float dpy = linearDepth(vUv + vec2(0.0, offset.y));
        float dmy = linearDepth(vUv - vec2(0.0, offset.y));

        vec2 xymult = saturate(1.0 - vec2(abs(dmx - dpx), abs(dmy - dpy)) * 1000.0);

        vec3 relief;
        relief.xy = vec2(hmx - hpx, hmy - hpy) * xymult / max(offset, vec2(1e-6)) * 0.5;
        relief.z = 1.0;
        relief = normalize(relief);

        // SSRBlendNormals
        vec3 a = nDepth + vec3(0.0, 0.0, 1.0);
        vec3 b = relief * vec3(-1.0, -1.0, 1.0);
        vec3 normal = a * dot(a, b) / a.z - b;

        vec3 dir = reflect(eyedir, normal);
        float sceneDepth = position.z / FAR_PLANE;
        float jitter = ssrBayer(gl_FragCoord.xy, 3) - 0.5;

        float stepLen = (0.2 + 0.05 * jitter * SSR_JITTER) * sqrt(max(sceneDepth, 1e-6))
            / (1e-3 + saturate(1.0 - dot(dir, eyedir)));
        vec3 rayPos = position + dir * stepLen;

        vec2 hitUv = vUv;
        int j = 0;
        int k = 0;
        bool insideScreen = true;

        for (int guard = 0; guard < 200; guard++)
        {
            if (j >= SSR_STEPS || !insideScreen) break;
            j++;

            hitUv = ssrScreenUv(rayPos);
            vec3 error = ssrPosition(hitUv) - rayPos;

            if (error.z < 0.0 && error.z > -SSR_ACCEPT_TOLERANCE * stepLen)
            {
                j = 0;
                if (k < SSR_REFINES)
                {
                    stepLen /= SSR_RAY_GROWTH;
                    rayPos -= dir * stepLen;
                    stepLen *= SSR_RAY_GROWTH / float(SSR_STEPS);
                }
                else
                {
                    j += SSR_STEPS;
                }
                k++;
            }

            rayPos += dir * stepLen;
            stepLen *= SSR_RAY_GROWTH;
            insideScreen = all(greaterThanEqual(hitUv, vec2(0.0))) && all(lessThanEqual(hitUv, vec2(1.0)));
        }

        float hit = (k != 0) ? 1.0 : 0.0;
        float fresnel_k = 0.04;
        float schlick = mix(fresnel_k, 1.0, pow(saturate(1.0 - dot(-eyedir, normal)), uSsrFresnel)) * uSsrStrength;
        float fade = saturate(dot(eyedir, dir)) * saturate(1.0 - dot(-eyedir, normal));
        float alpha = hit * schlick * fade;

        vec3 reflected = texture2D(uTex, clamp(hitUv, vec2(0.001), vec2(0.999))).rgb;
        gl_FragColor = vec4(reflected * alpha, alpha);
    }
`;

/* IntoxSSR SSRBlur, one axis at a time. The mask is the same normal buffer the
   source carries through the second render target. */
export const SSR_BLUR_FRAG = `
    precision highp float;
    varying vec2 vUv;
    #define saturate(x) clamp(x, 0.0, 1.0)
    uniform sampler2D uInput;
    uniform sampler2D uNormals;
    uniform vec2 uRes;
    uniform vec2 uDir;
    uniform float uRadius;
    uniform float uSmoothen;
    uniform float uErrorIntensity;
    uniform float uErrorSensitivity;

    vec4 fetchKey(vec2 uv) { return texture2D(uInput, clamp(uv, vec2(0.001), vec2(0.999))); }
    vec3 fetchNormal(vec2 uv) { return texture2D(uNormals, clamp(uv, vec2(0.001), vec2(0.999))).xyz * 2.0 - 1.0; }
    float fetchDepth(vec2 uv) { return texture2D(uNormals, clamp(uv, vec2(0.001), vec2(0.999))).w; }

    void main()
    {
        vec2 px = 1.0 / uRes;
        float radius = uRadius;

        vec4 center = fetchKey(vUv);
        vec3 nC = fetchNormal(vUv);
        float dC = fetchDepth(vUv);

        if (uRadius == 0.0 && uSmoothen == 0.0 && uErrorIntensity == 0.0)
        {
            gl_FragColor = center;
            return;
        }

        float error = 1.0 - saturate(center.a * uErrorSensitivity);
        float kernel_size = max(radius * (1.0 + uSmoothen), radius + error * uErrorIntensity * 4.0);
        float k = -2.0 / (kernel_size * kernel_size + 1e-3);

        vec4 blursum = vec4(0.0);
        vec4 blursum_noweight = vec4(0.0);
        float blursum_weight = 1e-3;
        float blursum_noweight_weight = 1e-3;

        for (float j = -12.0; j <= 12.0; j += 1.0)
        {
            if (abs(j) > floor(kernel_size)) continue;
            vec2 uv = vUv + uDir * px * (2.0 * j - 0.5);
            vec4 tap = fetchKey(uv);
            vec3 nT = fetchNormal(uv);
            float dT = fetchDepth(uv);

            float depth_term = saturate(1.0 - abs(dT - dC) * 50.0);
            float normal_term = saturate(dot(nT, nC) * 50.0 - 49.0);
            float error_term = saturate(1.0 - abs(tap.a - center.a) * (1.0 + uErrorSensitivity));
            float tap_weight = depth_term * normal_term * error_term;

            float w = exp(j * j * k) * tap.a;
            blursum += tap * tap_weight * w;
            blursum_weight += tap_weight * w;
            blursum_noweight += tap * w;
            blursum_noweight_weight += w;
        }

        blursum /= blursum_weight;
        blursum_noweight /= blursum_noweight_weight;

        float blend = saturate(blursum_weight * 2.0 * (1.0 + error * uErrorIntensity * 2.0));
        gl_FragColor = mix(center, blursum, blend);
    }
`;

export const FINAL_FRAG = `
    precision highp float;
    varying vec2 vUv;
    #define saturate(x) clamp(x, 0.0, 1.0)

    uniform sampler2D uTex;
    uniform sampler2D uDepth;
    uniform sampler2D uAOTex;
    uniform sampler2D uNormalsTex;
    uniform sampler2D uSSRTex;
    uniform vec2 uRes;
    uniform vec2 uDepthSize;
    uniform float uPxScale;

    uniform float uMxaoAmount;
    uniform float uSsrFade;
    uniform float uSsrGlobalRadius;

    uniform float uMXAOOn, uSSROn, uDCCOn, uMSAAOn, uSharpenOn, uClarityOn, uColourOn;
    uniform float uDebugSSR;
    uniform float uDebugAO;

    uniform float uDccTransition;
    uniform float uDccNearExposure, uDccNearBrightness, uDccNearContrast;
    uniform float uDccNearSaturation, uDccNearTemperature, uDccNearTint;
    uniform float uDccFarExposure, uDccFarBrightness, uDccFarContrast;
    uniform float uDccFarSaturation, uDccFarTemperature, uDccFarTint;
    uniform float uMsaaThreshold, uMsaaStrength;
    uniform float uSharpenSharpen, uSharpenDetails, uSharpenContrast;
    uniform float uClarityStrength, uClarityRadius;
    uniform float uColourAmount;

    #define PX (uPxScale / uRes)
    #define FAR_PLANE 1000.0

    vec3 T(vec2 uv) { return texture2D(uTex, clamp(uv, vec2(0.0005), vec2(0.9995))).rgb; }
    float D(vec2 uv)
    {
        vec4 t = texture2D(uDepth, clamp(uv, vec2(0.0005), vec2(0.9995)));
        return (t.r * 16711680.0 + t.g * 65280.0 + t.b * 255.0) / 16777215.0;
    }
    float linearDepth(vec2 uv) { return clamp(D(uv) / (1000.0 - D(uv) * 999.0), 0.0, 1.0); }
    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    vec3 msaa(vec3 c, vec2 uv)
    {
        vec3 n = T(uv + vec2(0.0, -1.0) * PX);
        vec3 s = T(uv + vec2(0.0,  1.0) * PX);
        vec3 w = T(uv + vec2(-1.0, 0.0) * PX);
        vec3 e = T(uv + vec2( 1.0, 0.0) * PX);

        float lc = luma(c), ln = luma(n), ls = luma(s), lw = luma(w), le = luma(e);
        float lo = min(lc, min(min(ln, ls), min(lw, le)));
        float hi = max(lc, max(max(ln, ls), max(lw, le)));
        float spread = hi - lo;

        if (spread <= uMsaaThreshold) return c;

        float changeX = abs(lw - lc) + abs(le - lc);
        float changeY = abs(ln - lc) + abs(ls - lc);
        vec3 along = changeX > changeY ? 0.5 * (n + s) : 0.5 * (w + e);

        float ramp = clamp((spread - uMsaaThreshold) / uMsaaThreshold, 0.0, 1.0);
        vec3 smoothed = mix(c, along, clamp(uMsaaStrength * ramp, 0.0, 1.0));

        // keep the original luma so AA doesn't sink the frame
        return clamp(smoothed * ((luma(c) + 0.02) / (luma(smoothed) + 0.02)), 0.0, 1.0);
    }

    vec3 sharpen(vec3 c, vec2 uv)
    {
        const float OFFSET = 1.4;

        vec3 c10 = T(uv + vec2( 0.3333, -1.0) * PX * OFFSET);
        vec3 c01 = T(uv + vec2(-1.0, -0.3333) * PX * OFFSET);
        vec3 c21 = T(uv + vec2( 1.0,  0.3333) * PX * OFFSET);
        vec3 c12 = T(uv + vec2(-0.3333, 1.0) * PX * OFFSET);
        vec3 b11 = (c10 + c01 + c12 + c21) * 0.25;

        float contrast = mix(2.0 * uSharpenContrast, uSharpenContrast, max(max(c.r, c.g), c.b));

        vec3 mn = min(min(c10, c01), min(c12, c21));
        mn = min(mn, c * (1.0 - contrast));
        vec3 mx = max(max(c10, c01), max(c12, c21));
        mx = max(mx, c * (1.0 + contrast));

        vec3 dif = pow(abs(mx - mn), vec3(0.75));
        vec3 amount = mix(vec3(uSharpenSharpen * uSharpenDetails), vec3(uSharpenSharpen), dif);
        return clamp(mix(c, b11, -amount), mn, mx);
    }

    vec3 clarity(vec3 c, vec2 uv)
    {
        float sum = 0.0;
        for (int i = 0; i < 8; i++)
        {
            float a = float(i) * 0.785398;
            vec2 o = vec2(cos(a), sin(a)) * PX * uClarityRadius;
            sum += luma(T(uv + o));
        }
        float wide = sum / 8.0;
        float delta = luma(c) - wide;
        float mask = smoothstep(0.03, 0.22, luma(c)) * (1.0 - smoothstep(0.72, 0.96, luma(c)));
        return clamp(c + delta * uClarityStrength * mask, 0.0, 1.0);
    }

    vec3 grade(vec3 c, float exposure, float brightness, float contrast,
               float saturation, float temperature, float tint)
    {
        c *= exp2(exposure);
        c = (c - 0.5) * contrast + 0.5;
        c += brightness;
        c = mix(vec3(luma(c)), c, saturation);
        c += vec3(temperature * 0.08, 0.0, -temperature * 0.08);
        c += vec3(tint * 0.04, 0.0, tint * 0.04);
        return c;
    }

    vec3 dcc(vec3 c, vec2 uv)
    {
        float d = D(uv);
        vec3 nearC = grade(c, uDccNearExposure, uDccNearBrightness, uDccNearContrast,
            uDccNearSaturation, uDccNearTemperature, uDccNearTint);
        vec3 farC = grade(c, uDccFarExposure, uDccFarBrightness, uDccFarContrast,
            uDccFarSaturation, uDccFarTemperature, uDccFarTint);
        float nearMix = 1.0 - smoothstep(0.0, max(uDccTransition, 0.001), d);
        return clamp(mix(farC, nearC, nearMix), 0.0, 1.0);
    }

    vec3 colourfulness(vec3 c)
    {
        const vec3 lumaCoeff = vec3(0.2558, 0.6511, 0.0931);
        float l = pow(dot(pow(c + 0.06, vec3(2.4)), lumaCoeff), 1.0 / 2.4) - 0.06;
        vec3 diff = c - l;
        return clamp(c + diff * uColourAmount, 0.0, 1.0);
    }


    vec3 mxaoBlur(vec2 uv, float radius, int steps)
    {
        vec2 offsets[8];
        offsets[0] = vec2( 1.5,  0.5); offsets[1] = vec2(-1.5, -0.5);
        offsets[2] = vec2(-0.5,  1.5); offsets[3] = vec2( 0.5, -1.5);
        offsets[4] = vec2( 1.5,  2.5); offsets[5] = vec2(-1.5, -2.5);
        offsets[6] = vec2(-2.5,  1.5); offsets[7] = vec2( 2.5, -1.5);

        vec2 scale = (1.0 / uDepthSize) * radius;
        vec3 nC = texture2D(uNormalsTex, uv).xyz * 2.0 - 1.0;
        float dC = texture2D(uNormalsTex, uv).w;

        float center = texture2D(uAOTex, uv).r;
        float blursum = center;
        float blursum_noweight = center;
        float blurweight = 1.0;

        for (int s = 0; s < 8; s++)
        {
            if (s >= steps) break;
            vec2 tap_uv = uv + offsets[s] * scale;
            float tap = texture2D(uAOTex, tap_uv).r;
            vec3 nT = texture2D(uNormalsTex, tap_uv).xyz * 2.0 - 1.0;
            float dT = texture2D(uNormalsTex, tap_uv).w;

            float tap_weight = saturate(1.0 - abs(dT - dC)) * saturate(dot(nT, nC) * 16.0 - 15.0);
            blurweight += tap_weight;
            blursum += tap * tap_weight;
            blursum_noweight += tap;
        }

        blursum /= blurweight;
        blursum_noweight /= 1.0 + float(steps);
        return vec3(mix(blursum, blursum_noweight, step(blurweight, 2.0)));
    }

    vec4 ssrGlobalBlur(vec2 uv, vec4 center)
    {
        if (uSsrGlobalRadius <= 1.0) return center;
        vec2 stepuv = (1.0 / uDepthSize) * uSsrGlobalRadius;
        vec4 sum = center;
        sum += texture2D(uSSRTex, uv + vec2( stepuv.x, 0.0));
        sum += texture2D(uSSRTex, uv + vec2(-stepuv.x, 0.0));
        sum += texture2D(uSSRTex, uv + vec2(0.0,  stepuv.y));
        sum += texture2D(uSSRTex, uv + vec2(0.0, -stepuv.y));
        sum += texture2D(uSSRTex, uv + stepuv);
        sum += texture2D(uSSRTex, uv - stepuv);
        sum += texture2D(uSSRTex, uv + vec2( stepuv.x, -stepuv.y));
        sum += texture2D(uSSRTex, uv + vec2(-stepuv.x,  stepuv.y));
        return sum / 9.0;
    }

    float ssrEdgeFade(vec2 uv)
    {
        float depth = linearDepth(uv);
        vec2 px = 1.0 / uDepthSize;
        float dx = max(abs(linearDepth(uv + vec2(px.x, 0.0)) - depth),
                       abs(linearDepth(uv - vec2(px.x, 0.0)) - depth));
        float dy = max(abs(linearDepth(uv + vec2(0.0, px.y)) - depth),
                       abs(linearDepth(uv - vec2(0.0, px.y)) - depth));
        return 1.0 - smoothstep(0.002, 0.02, max(dx, dy));
    }

    void main()
    {
        if (uDebugSSR > 0.5)
        {
            vec4 raw = texture2D(uSSRTex, vUv);
            gl_FragColor = vec4(uDebugSSR > 1.5 ? vec3(raw.a) : raw.rgb, 1.0);
            return;
        }

        if (uDebugAO > 0.5)
        {
            vec4 raw = texture2D(uAOTex, vUv);
            gl_FragColor = vec4(uDebugAO > 1.5 ? vec3(raw.a) : vec3(raw.r), 1.0);
            return;
        }

        vec3 c = T(vUv);

        if (uSSROn > 0.5)
        {
            vec4 reflection = texture2D(uSSRTex, vUv);
            c = mix(c, reflection.rgb, clamp(reflection.a, 0.0, 1.0));
        }

        if (uMXAOOn > 0.5)
        {
            // PS_SpatialFilter2: 8-step blur at radius 1, squared, amount, fade
            float ao = mxaoBlur(vUv, 1.0, 8).x;
            ao *= ao;
            ao = 1.0 - pow(saturate(1.0 - ao), uMxaoAmount * 2.0);
            ao *= 1.0 - smoothstep(0.0, 1.0, linearDepth(vUv));

            float blendfact = 1.0 - dot(c, vec3(0.2126, 0.7152, 0.0722));
            c *= saturate(1.0 - ao * blendfact * 1.2);
        }

        if (uDCCOn > 0.5) c = dcc(c, vUv);
        if (uSharpenOn > 0.5) c = sharpen(c, vUv);
        if (uClarityOn > 0.5) c = clarity(c, vUv);
        if (uColourOn > 0.5) c = colourfulness(c);
        if (uMSAAOn > 0.5) c = msaa(c, vUv);

        gl_FragColor = vec4(c, 1.0);
    }
`;
