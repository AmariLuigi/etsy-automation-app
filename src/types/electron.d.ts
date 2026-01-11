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

export interface StlAnalysisResult {
    success: boolean;
    dimensions: {
        x: number;
        y: number;
        z: number;
    };
    triangleCount: number;
    volume: number;
    surfaceArea: number;
    fileSize: number;
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
    uploadImage: (data: {
        apiKey: string;
        imageBase64: string;
        fileName: string;
    }) => Promise<{ success: boolean; fileName?: string; error?: string }>;
    cancelTask: (data: {
        apiKey: string;
        taskId: string;
    }) => Promise<{ code: number; msg: string; data: any }>;
    onTaskId: (callback: (taskId: string) => void) => void;
    selectFolder: () => Promise<string | null>;
    saveFile: (folderPath: string, fileName: string, dataUrl: string) => Promise<boolean>;
    rcloneGenerateLink: (remotePath: string) => Promise<{ success: boolean; link?: string; error?: string }>;
    rcloneCopyToDrive: (localPath: string, remotePath: string) => Promise<{ success: boolean; error?: string }>;
    generateVideoAiApp: (data: {
        apiKey: string;
        webappId: string;
        instanceType?: string;
        nodeInfoList: Array<{
            nodeId: string;
            fieldName: string;
            fieldValue: string;
            description?: string;
        }>;
    }) => Promise<string | null>;
    // STL Analysis
    openStlDialog: () => Promise<string | null>;
    analyzeStl: (filePath: string) => Promise<StlAnalysisResult>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

