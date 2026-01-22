export async function onRequest(context) {
    const { request, params } = context;
    const path = params.path; // array of path segments

    if (!path || path.length < 2) {
        return new Response('Invalid path', { status: 400 });
    }

    const [modelName, fileType] = path;

    // Define model base URLs
    const models = {
        tiny: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/',
        base: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base/resolve/main/',
    };

    // Special case for WASM data
    if (modelName === 'wasm-data') {
        const targetUrl = 'https://huggingface.co/k2-fsa/web-assembly-vad-asr-sherpa-onnx-ja-zipformer/resolve/main/sherpa-onnx-wasm-main-vad-asr.data';
        try {
            const response = await fetch(targetUrl, {
                headers: { 'User-Agent': 'Cloudflare-Pages-Proxy' }
            });
            if (!response.ok) return new Response('Upstream Error', { status: response.status });

            const newHeaders = new Headers(response.headers);
            newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
            newHeaders.set('Access-Control-Allow-Origin', '*');

            return new Response(response.body, { status: response.status, headers: newHeaders });
        } catch (e) {
            return new Response(e.message, { status: 500 });
        }
    }

    if (!models[modelName]) {
        return new Response('Model not found', { status: 404 });
    }

    // Map file types to actual filenames
    const files = {
        tiny: {
            encoder: 'tiny-encoder.int8.onnx',
            decoder: 'tiny-decoder.int8.onnx',
            tokens: 'tiny-tokens.txt',
        },
        base: {
            encoder: 'base-encoder.int8.onnx',
            decoder: 'base-decoder.int8.onnx',
            tokens: 'base-tokens.txt',
        }
    };

    const fileName = files[modelName][fileType];
    if (!fileName) {
        return new Response('File not found', { status: 404 });
    }

    const targetUrl = models[modelName] + fileName;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Cloudflare-Pages-Proxy'
            }
        });

        if (!response.ok) {
            return new Response(`Upstream Error: ${response.status} ${response.statusText}`, { status: response.status });
        }

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
        newHeaders.set('Access-Control-Allow-Origin', '*');

        // Remove headers that might cause issues or are no longer valid
        newHeaders.delete('Content-Security-Policy');
        newHeaders.delete('Content-Encoding'); // Let build handle compression or passthrough

        return new Response(response.body, {
            status: response.status,
            headers: newHeaders
        });

    } catch (e) {
        return new Response(`Proxy Error: ${e.message}`, { status: 500 });
    }
}
