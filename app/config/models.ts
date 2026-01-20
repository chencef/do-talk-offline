export interface ModelConfig {
    name: string;
    files: {
        encoder: string;
        decoder: string;
        tokens: string;
    };
    urls: {
        encoder: string;
        decoder: string;
        tokens: string;
    };
}

export const WHISPER_MODELS: Record<string, ModelConfig> = {
    tiny: {
        name: 'Whisper Tiny (Multilingual)',
        files: {
            encoder: 'tiny-encoder.int8.onnx',
            decoder: 'tiny-decoder.int8.onnx',
            tokens: 'tiny-tokens.txt',
        },
        urls: {
            encoder: '/models/tiny-encoder.int8.onnx',
            decoder: '/models/tiny-decoder.int8.onnx',
            tokens: '/models/tiny-tokens.txt',
        },
    },
    base: {
        name: 'Whisper Base (Multilingual)',
        files: {
            encoder: 'base-encoder.int8.onnx',
            decoder: 'base-decoder.int8.onnx',
            tokens: 'base-tokens.txt',
        },
        urls: {
            encoder: '/models/base/base-encoder.int8.onnx',
            decoder: '/models/base/base-decoder.int8.onnx',
            tokens: '/models/base/base-tokens.txt',
        },
    },
};
