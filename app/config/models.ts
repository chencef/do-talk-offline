export interface ModelConfig {
    name: string;
    files: {
        encoder: string;
        decoder: string;
        tokens: string;
        vad: string;
    };
    urls: {
        encoder: string;
        decoder: string;
        tokens: string;
        vad: string;
    };
}

export const WHISPER_MODELS: Record<string, ModelConfig> = {
    tiny: {
        name: 'tiny',
        files: {
            encoder: 'tiny-encoder.int8.onnx',
            decoder: 'tiny-decoder.int8.onnx',
            tokens: 'tiny-tokens.txt',
            vad: 'silero_vad.onnx',
        },
        urls: {
            encoder: '/proxy-model/tiny/encoder',
            decoder: '/proxy-model/tiny/decoder',
            tokens: '/proxy-model/tiny/tokens',
            vad: '/silero_vad.onnx',
        }
    },
    base: {
        name: 'base',
        files: {
            encoder: 'base-encoder.int8.onnx',
            decoder: 'base-decoder.int8.onnx',
            tokens: 'base-tokens.txt',
            vad: 'silero_vad.onnx', // Shared VAD
        },
        urls: {
            encoder: '/proxy-model/base/encoder',
            decoder: '/proxy-model/base/decoder',
            tokens: '/proxy-model/base/tokens',
            vad: '/silero_vad.onnx',
        }
    }
};
