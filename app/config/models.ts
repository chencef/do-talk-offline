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
            encoder: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-encoder.int8.onnx',
            decoder: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-decoder.int8.onnx',
            tokens: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main/tiny-tokens.txt',
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
            // Using Hugging Face CDN for base model as well to avoid bundling large files
            encoder: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base/resolve/main/base-encoder.int8.onnx',
            decoder: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base/resolve/main/base-decoder.int8.onnx',
            tokens: 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base/resolve/main/base-tokens.txt',
            vad: '/silero_vad.onnx',
        }
    }
};
