export { };

declare global {
    interface Window {
        Module: any;
        OfflineRecognizer: any;
        createVad: any;
        CircularBuffer: any;
    }
}
