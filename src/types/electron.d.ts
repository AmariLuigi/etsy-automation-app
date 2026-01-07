export interface FolderAnalysis {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    images: string[];
    folderName: string;
    parentFolder: string;
}

export interface WatermarkResult {
    success: boolean;
    imageUrl?: string;
    error?: string;
}

export interface AccountStatus {
    success: boolean;
    data?: {
        remainCoins: string;
        currentTasks: string;
        remainMoney: string;
        currency: string;
        apiType: string;
    };
    error?: string;
}

export interface ElectronAPI {
    openFolderDialog: () => Promise<string | null>;
    analyzeFolder: (folderPath: string) => Promise<FolderAnalysis | null>;
    readFileAsBase64: (filePath: string) => Promise<string | null>;
    platform: string;
    generateContent: (data: {
        apiKey: string;
        workflowId: string;
        nodeInfo: Array<{ node_id: string, field_name: string, value: any }>
    }) => Promise<string>;
    removeWatermark: (data: {
        apiKey: string;
        workflowId: string;
        imageBase64: string;
        fileName: string;
    }) => Promise<WatermarkResult>;
    getAccountStatus: (data: {
        apiKey: string;
    }) => Promise<AccountStatus>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
