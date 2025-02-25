declare function acquireVsCodeApi(): {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
};

// Get VS Code API
const vscode = acquireVsCodeApi();

// Export for use in components
export const tsvscode = vscode; 