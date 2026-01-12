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
    centerOfMass?: {
        x: number;
        y: number;
        z: number;
        relativeX: number; // Percentage relative to bounding box (0-100)
        relativeY: number;
        relativeZ: number;
    };
    meshQuality?: {
        isWatertight: boolean;
        watertightRatio: number; // 0-1, ratio of edges with exactly 2 triangles
        openEdges: number; // Edges with 1 triangle (boundary)
        nonManifoldEdges: number; // Edges with 3+ triangles
        duplicateVertices: number;
    };
    triangleStats?: {
        min: number; // mm²
        max: number; // mm²
        avg: number; // mm²
    };
    bounds?: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        minZ: number;
        maxZ: number;
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
    readStlFile: (filePath: string) => Promise<string | null>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

