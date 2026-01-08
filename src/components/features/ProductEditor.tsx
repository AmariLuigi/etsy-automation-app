import { useState, useEffect } from "react"
import type { FolderAnalysis } from "../../types/electron"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
    Info,
    FileText,
    Image as ImageIcon,
    Rocket,
    Sparkles,
    Download,
    Trash2,
    Plus,
    X,
    Loader2,
    Video,
    Play,
    Monitor,
    Eye,
    ChevronFirst,
    ChevronLast,
    Pencil
} from "lucide-react"
import ImageEditor from "./ImageEditor"

interface ProductEditorProps {
    folderData: FolderAnalysis
    generatedContent: {
        title: string
        description: string
        tags: string[]
    } | null
    onContentChange: (content: { title: string; description: string; tags: string[] } | null) => void
}

export default function ProductEditor({ folderData, generatedContent, onContentChange }: ProductEditorProps) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [tags, setTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState("")
    const [images, setImages] = useState<string[]>([])
    const [loadingImages, setLoadingImages] = useState(false)
    const [specialInstructions, setSpecialInstructions] = useState("Resin printer recommended, FDM compatible with supports. Highly detailed sculpt.")
    const [isRegenerating, setIsRegenerating] = useState(false)

    // Watermark removal state
    const [uploadedImages, setUploadedImages] = useState<{ name: string; base64: string }[]>([])
    const [processedImages, setProcessedImages] = useState<{ name: string; url: string; original: string }[]>([])
    const [isProcessingWatermarks, setIsProcessingWatermarks] = useState(false)
    const [watermarkProgress, setWatermarkProgress] = useState({ current: 0, total: 0 })

    // Video generation state
    const [videoStartImage, setVideoStartImage] = useState<string | null>(null)
    const [videoEndImage, setVideoEndImage] = useState<string | null>(null)
    const [videoWidth, setVideoWidth] = useState(540)
    const [videoHeight, setVideoHeight] = useState(720)
    const [videoFrames, setVideoFrames] = useState(81)
    const [videoPrompt, setVideoPrompt] = useState("360 camera movement of a static action figure showcase.")
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
    const [videoTimer, setVideoTimer] = useState(0)
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

    // Image preview state
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [comparisonPreview, setComparisonPreview] = useState<{ before: string; after: string } | null>(null)
    const [comparisonPosition, setComparisonPosition] = useState(50)

    useEffect(() => {
        let interval: any;
        if (isGeneratingVideo) {
            setVideoTimer(0)
            interval = setInterval(() => {
                setVideoTimer(prev => prev + 1)
            }, 1000)
        } else {
            clearInterval(interval)
        }
        return () => clearInterval(interval)
    }, [isGeneratingVideo])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    useEffect(() => {
        window.electronAPI.onTaskId((taskId: string) => {
            console.log("🆔 Received Task ID from backend:", taskId);
            setCurrentTaskId(taskId);
        });
    }, []);

    const sizeGB = (folderData.totalSize / (1024 * 1024 * 1024)).toFixed(2)

    useEffect(() => {
        if (generatedContent) {
            setTitle(generatedContent.title)
            setDescription(generatedContent.description)
            setTags(generatedContent.tags)
        }
    }, [generatedContent])

    useEffect(() => {
        async function loadImages() {
            if (folderData.images.length > 0) {
                setLoadingImages(true)
                const loadedImages: string[] = []
                for (const imgPath of folderData.images.slice(0, 10)) {
                    const base64 = await window.electronAPI.readFileAsBase64(imgPath)
                    if (base64) loadedImages.push(base64)
                }
                setImages(loadedImages)
                setLoadingImages(false)
            }
        }
        loadImages()
    }, [folderData.images])

    const handleBatchWatermarkRemoval = async () => {
        const apiKey = localStorage.getItem("runningHubApiKey")
        const workflowId = localStorage.getItem("watermarkWorkflowId") || "2008860019835543553"

        if (!apiKey) {
            alert("Please add your RunningHub API Key in Settings first!")
            return
        }

        setIsProcessingWatermarks(true)
        setWatermarkProgress({ current: 0, total: uploadedImages.length })

        const results: { name: string; url: string; original: string }[] = []

        for (let i = 0; i < uploadedImages.length; i++) {
            const img = uploadedImages[i]
            setWatermarkProgress({ current: i + 1, total: uploadedImages.length })

            try {
                const base64Data = img.base64.split(",")[1] || img.base64
                const result = await window.electronAPI.removeWatermark({
                    apiKey,
                    workflowId,
                    imageBase64: base64Data,
                    fileName: img.name
                })

                if (result.success && result.imageUrl) {
                    results.push({ name: img.name, url: result.imageUrl, original: img.base64 })
                }
            } catch (error) {
                console.error(`Error processing ${img.name}:`, error)
            }
        }

        setProcessedImages(prev => [...prev, ...results])
        setUploadedImages([])
        setIsProcessingWatermarks(false)
        setWatermarkProgress({ current: 0, total: 0 })
    }

    const addFolderImageToQueue = (base64: string, index: number) => {
        setUploadedImages(prev => [...prev, { name: `folder-image-${index + 1}.png`, base64 }])
    }

    const handleImageUpload = async (files: File[]) => {
        const newImages: { name: string; base64: string }[] = []
        for (const file of files) {
            const reader = new FileReader()
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = (e) => resolve(e.target?.result as string)
                reader.readAsDataURL(file)
            })
            newImages.push({ name: file.name, base64 })
        }
        setUploadedImages(prev => [...prev, ...newImages])
    }

    const handleRegenerateAI = async () => {
        const apiKey = localStorage.getItem("runningHubApiKey")
        const workflowId = localStorage.getItem("runningHubWorkflowId")

        if (!apiKey || !workflowId) {
            alert("Please configure RunningHub API Key and Workflow ID in Settings!")
            return
        }

        setIsRegenerating(true)
        try {
            const sizeGB = (folderData.totalSize / (1024 * 1024 * 1024)).toFixed(2)
            const fileTypesList = Object.keys(folderData.fileTypes).join(", ").toUpperCase()

            // Map data to the specific nodes in your workflow JSON
            const nodeInfo = [
                { node_id: "10", field_name: "text", value: folderData.folderName }, // Character Name
                { node_id: "11", field_name: "text", value: folderData.parentFolder }, // Franchise
                { node_id: "12", field_name: "text", value: `${folderData.totalFiles} Files` }, // File Count
                { node_id: "13", field_name: "text", value: `${sizeGB} GB` }, // File Size
                { node_id: "14", field_name: "text", value: fileTypesList }, // File Types
                { node_id: "15", field_name: "text", value: specialInstructions } // Additional Notes
            ]

            console.log("🚀 Sending Multi-Node Generation Request:", nodeInfo)

            const result = await window.electronAPI.generateContent({
                apiKey,
                workflowId,
                nodeInfo
            })

            if (result) {
                const text = result.toString()

                // Parsing markers from your workflow instructions
                const titleMatch = text.match(/\*\*TITLE:\*\*\n?([\s\S]*?)(?=\*\*DESCRIPTION:\*\*|$)/i)
                const descMatch = text.match(/\*\*DESCRIPTION:\*\*\n?([\s\S]*?)(?=\*\*TAGS:\*\*|$)/i)
                const tagsMatch = text.match(/\*\*TAGS:\*\*\n?([\s\S]*?)(?=\*\*MATERIALS:\*\*|$)/i)

                const newTitle = titleMatch ? titleMatch[1].replace(/^\n+/, "").trim() : title
                const newDescription = descMatch ? descMatch[1].replace(/^\n+/, "").trim() : text

                // Clean and split tags (handles commas or newlines)
                const extractedTags = tagsMatch
                    ? tagsMatch[1].trim().split(/,|\n/).map(t => t.trim()).filter(t => t && t.length > 2)
                    : []

                const newTags = extractedTags.length > 0 ? extractedTags : tags

                setTitle(newTitle)
                setDescription(newDescription)
                setTags(newTags)

                onContentChange({
                    title: newTitle,
                    description: newDescription,
                    tags: newTags
                })
            }
        } catch (error) {
            console.error("AI Generation failed:", error)
            alert("Failed to generate content. Check console for details.")
        } finally {
            setIsRegenerating(false)
        }
    }

    const handleGenerateVideo = async () => {
        console.log("🎬 Starting Video Generation Process...");
        const apiKey = localStorage.getItem("runningHubApiKey")
        const videoWorkflowId = localStorage.getItem("videoWorkflowId")

        if (!apiKey || !videoWorkflowId) {
            alert("Configuration Error: Missing API Key or Video Workflow ID in settings.")
            return
        }

        if (!videoStartImage || !videoEndImage) {
            alert("Selection Error: Please pick both a Start and End frame first.")
            return
        }

        setIsGeneratingVideo(true)
        setGeneratedVideoUrl(null)

        try {
            console.log("🚀 Step 1: Uploading images to RunningHub...");
            const startUpload = await window.electronAPI.uploadImage({
                apiKey,
                imageBase64: videoStartImage,
                fileName: "video-start.png"
            })

            const endUpload = await window.electronAPI.uploadImage({
                apiKey,
                imageBase64: videoEndImage,
                fileName: "video-end.png"
            })

            if (!startUpload.success || !endUpload.success) {
                const fault = !startUpload.success ? "Start Frame" : "End Frame";
                const msg = `Upload failed for ${fault}: ${startUpload.error || endUpload.error || 'Unknown error'}`;
                console.error("❌ " + msg);
                throw new Error(msg);
            }

            console.log("✅ Step 1 Complete: Images uploaded.", { start: startUpload.fileName, end: endUpload.fileName });

            // 2. Map to nodes 66, 90, 94, 95, 96, 91
            const nodeInfo = [
                { node_id: "66", field_name: "image", value: startUpload.fileName },
                { node_id: "90", field_name: "image", value: endUpload.fileName },
                { node_id: "94", field_name: "value", value: videoWidth },
                { node_id: "95", field_name: "value", value: videoHeight },
                { node_id: "96", field_name: "value", value: videoFrames },
                { node_id: "91", field_name: "value", value: videoPrompt }
            ]

            console.log("🚀 Step 2: Requesting video generation with Node Info:", nodeInfo);

            const result = await window.electronAPI.generateContent({
                apiKey,
                workflowId: videoWorkflowId,
                nodeInfo
            })

            console.log("🎁 Step 3: API Result Received:", result);

            if (result && result.startsWith("http")) {
                console.log("✨ SUCCESS: Video URL set to state.");
                setGeneratedVideoUrl(result)
            } else if (result && result.includes("cancelled")) {
                console.log("🛑 Generation was cancelled by user.");
            } else {
                console.warn("⚠️ API returned non-URL result:", result);
                throw new Error(result || "The AI task completed but didn't return a video URL.");
            }
        } catch (error: any) {
            console.error("❌ VIDEO GENERATION ERROR:", error)
            alert(`Video Generation Failed: ${error.message || error}`)
        } finally {
            setIsGeneratingVideo(false)
            setCurrentTaskId(null)
        }
    }

    const handleCancelVideo = async () => {
        if (!currentTaskId) return;

        const apiKey = localStorage.getItem("runningHubApiKey")
        if (!apiKey) return;

        console.log("🛑 Requesting cancellation for task:", currentTaskId);
        try {
            const result = await window.electronAPI.cancelTask({
                apiKey,
                taskId: currentTaskId
            })
            if (result.code === 0) {
                console.log("✅ Task cancelled successfully");
                alert("Video generation task cancelled.")
            } else {
                console.error("❌ Failed to cancel task:", result.msg);
                alert("Failed to cancel task: " + result.msg)
            }
        } catch (error) {
            console.error("❌ Cancel Error:", error);
        } finally {
            setIsGeneratingVideo(false)
            setCurrentTaskId(null)
        }
    }

    return (
        <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-stone-900/60 h-12 p-1 border border-stone-800/60 rounded-none">
                <TabsTrigger value="info" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Info className="w-3.5 h-3.5" /> Info
                </TabsTrigger>
                <TabsTrigger value="description" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <FileText className="w-3.5 h-3.5" /> Description
                </TabsTrigger>
                <TabsTrigger value="images" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <ImageIcon className="w-3.5 h-3.5" /> Images
                </TabsTrigger>
                <TabsTrigger value="video" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Video className="w-3.5 h-3.5" /> Video
                </TabsTrigger>
                <TabsTrigger value="edit" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                </TabsTrigger>
                <TabsTrigger value="publish" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Rocket className="w-3.5 h-3.5" /> Publish
                </TabsTrigger>
            </TabsList>

            <div className="mt-8 animate-fade-in">
                <TabsContent value="info" className="m-0 flex flex-col gap-10">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-6">
                        <Card className="col-span-2 row-span-2 bg-stone-900/50 border-stone-800/60 !pl-6 !pr-10 py-6 rounded-none">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 block">Product Folder</label>
                            <h3 className="text-xl font-bold text-stone-100 uppercase tracking-tight truncate">{folderData.folderName}</h3>
                        </Card>
                        <Card className="bg-stone-900/50 border-stone-800/60 p-6 text-center rounded-none">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 block">Total Files</label>
                            <div className="text-3xl font-bold text-primary tabular-nums">{folderData.totalFiles}</div>
                        </Card>
                        <Card className="bg-stone-900/50 border-stone-800/60 p-6 text-center rounded-none">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 block">Size</label>
                            <div className="text-2xl font-bold text-stone-200 tabular-nums">{sizeGB} <span className="text-sm font-medium text-stone-600">GB</span></div>
                        </Card>

                        {/* Formats - right of product folder */}
                        <Card className="col-span-2 bg-stone-900/50 border-stone-800/60 !pl-6 !pr-10 py-6 rounded-none">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4 block">Detected Formats</label>
                            <div className="flex flex-wrap gap-4 justify-center items-center">
                                {Object.entries(folderData.fileTypes).map(([ext, count]) => (
                                    <span key={ext} className="inline-flex items-center justify-center border px-6 py-2 bg-stone-800/80 border-stone-700/50 text-stone-300 text-sm font-medium rounded-sm">
                                        .{ext.toUpperCase()} ({count})
                                    </span>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Title Input */}
                    <Card className="bg-stone-900/50 border-stone-800/60 !pl-6 !pr-10 py-6 rounded-none">
                        <label className="text-xs font-bold uppercase tracking-wider text-primary mb-4 block">Listing Title</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-stone-950 border-stone-800 h-12 text-base font-semibold tracking-tight focus-visible:ring-primary/20 rounded-none"
                        />
                    </Card>

                    {/* AI Instructions */}
                    <Card className="bg-stone-900/50 border-stone-800/60 !pl-6 !pr-10 py-6 rounded-none">
                        <label className="text-xs font-bold uppercase tracking-wider text-primary mb-4 block">AI Instructions</label>
                        <Textarea
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            className="bg-stone-950 border-stone-800 resize-none h-28 p-4 text-stone-300 font-medium leading-relaxed focus-visible:ring-primary/20 rounded-none"
                            placeholder="Add specific technical details, printer recommendations, or artist credits..."
                        />
                    </Card>
                </TabsContent>

                <TabsContent value="description" className="m-0">
                    <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                        <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-stone-800/40">
                            <div>
                                <CardTitle className="text-sm font-bold uppercase tracking-widest">Product Description</CardTitle>
                                <CardDescription className="text-xs font-medium text-stone-500 mt-1">Generated Etsy content</CardDescription>
                            </div>
                            <Button onClick={handleRegenerateAI} disabled={isRegenerating} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 h-9 !px-6 text-[10px] font-bold uppercase tracking-wider rounded-none">
                                {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                                Regenerate
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-stone-950 border-stone-800 font-mono text-sm min-h-[400px] rounded-none"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- IMAGES / WATERMARK TAB --- */}
                <TabsContent value="images" className="m-0 flex flex-col gap-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Processing Section */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                                <CardHeader className="!pl-6 !pr-10 py-5 border-b border-stone-800/40">
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Watermark Removal</CardTitle>
                                    <CardDescription className="text-xs font-medium text-stone-500">Queue images for AI processing</CardDescription>
                                </CardHeader>
                                <CardContent className="!pl-6 !pr-10 py-6 space-y-6">
                                    {/* Upload Zone */}
                                    <div
                                        className="border-2 border-dashed border-stone-800 bg-stone-950/50 p-10 text-center hover:border-primary/50 transition-colors cursor-pointer rounded-none"
                                        onClick={() => document.getElementById("watermark-upload")?.click()}
                                    >
                                        <input
                                            id="watermark-upload"
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => e.target.files && handleImageUpload(Array.from(e.target.files))}
                                        />
                                        <div className="bg-stone-900 w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-stone-800">
                                            <Download className="w-6 h-6 text-stone-500" />
                                        </div>
                                        <p className="text-sm font-bold uppercase text-stone-300 tracking-wide">Click or drag images</p>
                                        <p className="text-xs text-stone-500 mt-2">JPG, PNG, WebP</p>
                                    </div>

                                    {/* Queue */}
                                    {uploadedImages.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Queue ({uploadedImages.length})</span>
                                                <button onClick={() => setUploadedImages([])} className="text-xs font-medium text-destructive hover:underline">Clear</button>
                                            </div>
                                            <div className="grid grid-cols-5 gap-3">
                                                {uploadedImages.map((img, idx) => (
                                                    <div key={idx} className="relative aspect-square border border-stone-800 bg-stone-950 overflow-hidden group">
                                                        <img 
                                                            src={img.base64} 
                                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" 
                                                            onClick={() => setPreviewImage(img.base64)}
                                                        />
                                                        <div className="absolute inset-0 bg-stone-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity pointer-events-none">
                                                            <Eye className="w-4 h-4 text-white" />
                                                        </div>
                                                        <button
                                                            onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                                                            className="absolute top-1 right-1 bg-stone-950/80 p-1 text-white opacity-0 group-hover:opacity-100 z-10"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button
                                                className="w-full h-11 font-bold uppercase tracking-wider text-xs rounded-none !px-8"
                                                onClick={handleBatchWatermarkRemoval}
                                                disabled={isProcessingWatermarks}
                                            >
                                                {isProcessingWatermarks ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                Process Batch
                                            </Button>
                                            {isProcessingWatermarks && (
                                                <div className="space-y-2">
                                                    <Progress value={(watermarkProgress.current / watermarkProgress.total) * 100} className="h-1 bg-stone-800" />
                                                    <p className="text-xs text-center text-stone-500 font-medium">Processing {watermarkProgress.current}/{watermarkProgress.total}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Results */}
                                    {processedImages.length > 0 && (
                                        <div className="space-y-4 pt-4 border-t border-stone-800/40">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-primary rounded-full" />
                                                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Results ({processedImages.length})</span>
                                                <span className="text-[10px] text-stone-600 ml-2">Click to compare</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                {processedImages.map((img, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className="relative aspect-square border border-primary/20 bg-stone-950 overflow-hidden group cursor-pointer"
                                                        onClick={() => setComparisonPreview({ before: img.original, after: img.url })}
                                                    >
                                                        <img src={img.url} className="w-full h-full object-cover" />
                                                        {/* Hover overlay */}
                                                        <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Eye className="w-6 h-6 text-white" />
                                                        </div>
                                                        {/* Action buttons */}
                                                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 bg-stone-950/80 hover:text-primary" onClick={(e) => { e.stopPropagation(); /* download */ }}><Download className="w-3 h-3" /></Button>
                                                            <Button onClick={(e) => { e.stopPropagation(); setProcessedImages(prev => prev.filter((_, i) => i !== idx)); }} size="icon" variant="ghost" className="h-6 w-6 bg-stone-950/80 hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                                                        </div>
                                                        <div className="absolute top-1 left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 bg-stone-950/80 hover:text-green-500" onClick={(e) => { e.stopPropagation(); setVideoStartImage(img.url); }} title="Set as First Frame"><ChevronFirst className="w-3 h-3" /></Button>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 bg-stone-950/80 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); setVideoEndImage(img.url); }} title="Set as Last Frame"><ChevronLast className="w-3 h-3" /></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Source Images Sidebar */}
                        <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                            <CardHeader className="!pl-6 !pr-10 py-5 border-b border-stone-800/40">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-stone-500">Source Folder</CardTitle>
                                    <Button
                                        variant="link"
                                        className="h-auto p-0 text-xs uppercase font-bold text-primary"
                                        onClick={() => images.forEach((img, idx) => addFolderImageToQueue(img, idx))}
                                    >
                                        Add All
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar space-y-3">
                                {loadingImages ? (
                                    <div className="flex justify-center py-8 text-stone-600"><Loader2 className="animate-spin w-5 h-5" /></div>
                                ) : images.map((img, idx) => (
                                    <div key={idx} className="flex gap-4 bg-stone-950/50 border border-stone-800/60 p-3 group hover:border-primary/30 transition-colors">
                                        <div 
                                            className="w-14 h-14 bg-stone-900 flex-shrink-0 overflow-hidden cursor-pointer relative"
                                            onClick={() => setPreviewImage(img)}
                                        >
                                            <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-stone-950/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Eye className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <p className="text-xs font-medium text-stone-400 truncate">Image {idx + 1}</p>
                                            <button
                                                onClick={() => addFolderImageToQueue(img, idx)}
                                                className="flex items-center gap-1.5 text-[10px] font-medium text-stone-500 hover:text-primary"
                                            >
                                                <Plus className="w-3 h-3" /> Add to queue
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- VIDEO TAB --- */}
                <TabsContent value="video" className="m-0 flex flex-col gap-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Video Section */}
                        <div className="lg:col-span-2">
                            <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                                <CardHeader className="p-5 border-b border-stone-800/40">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-xs font-bold uppercase tracking-widest">Video Generator</CardTitle>
                                            <CardDescription className="text-[10px] font-medium text-stone-500">Create 360° showcase video</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="border-primary/40 text-primary text-[9px] font-bold px-2 rounded-sm">WAN 2.1</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 space-y-5">
                                    {/* Frame Previews */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Start Frame</label>
                                            <div className="aspect-square bg-stone-950 border border-stone-800 flex items-center justify-center overflow-hidden relative group">
                                                {videoStartImage ? (
                                                    <>
                                                        <img 
                                                            src={videoStartImage} 
                                                            className="w-full h-full object-cover cursor-pointer" 
                                                            onClick={() => setPreviewImage(videoStartImage)}
                                                        />
                                                        <div className="absolute inset-0 bg-stone-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                                            <Eye className="w-6 h-6 text-white" />
                                                        </div>
                                                        <button
                                                            onClick={() => setVideoStartImage(null)}
                                                            className="absolute top-2 right-2 bg-stone-950/80 p-1.5 text-white opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity z-10"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <Monitor className="w-6 h-6 text-stone-700" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">End Frame</label>
                                            <div className="aspect-square bg-stone-950 border border-stone-800 flex items-center justify-center overflow-hidden relative group">
                                                {videoEndImage ? (
                                                    <>
                                                        <img 
                                                            src={videoEndImage} 
                                                            className="w-full h-full object-cover cursor-pointer" 
                                                            onClick={() => setPreviewImage(videoEndImage)}
                                                        />
                                                        <div className="absolute inset-0 bg-stone-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                                            <Eye className="w-6 h-6 text-white" />
                                                        </div>
                                                        <button
                                                            onClick={() => setVideoEndImage(null)}
                                                            className="absolute top-2 right-2 bg-stone-950/80 p-1.5 text-white opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity z-10"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <Monitor className="w-6 h-6 text-stone-700" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Config Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Width</label>
                                            <Input type="number" value={videoWidth} onChange={(e) => setVideoWidth(parseInt(e.target.value))} className="bg-stone-950 border-stone-800 h-9 text-sm rounded-none" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Height</label>
                                            <Input type="number" value={videoHeight} onChange={(e) => setVideoHeight(parseInt(e.target.value))} className="bg-stone-950 border-stone-800 h-9 text-sm rounded-none" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Frames</label>
                                            <Input type="number" value={videoFrames} onChange={(e) => setVideoFrames(parseInt(e.target.value))} className="bg-stone-950 border-stone-800 h-9 text-sm rounded-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Prompt</label>
                                        <Textarea
                                            value={videoPrompt}
                                            onChange={(e) => setVideoPrompt(e.target.value)}
                                            className="bg-stone-950 border-stone-800 h-16 resize-none text-xs rounded-none"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1 h-10 font-bold uppercase tracking-wider text-[10px] rounded-none !px-8"
                                            onClick={handleGenerateVideo}
                                            disabled={isGeneratingVideo}
                                        >
                                            {isGeneratingVideo ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                                                    Generating ({formatTime(videoTimer)})
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-3.5 h-3.5 mr-2" />
                                                    Generate Video
                                                </>
                                            )}
                                        </Button>
                                        {isGeneratingVideo && (
                                            <Button
                                                variant="destructive"
                                                className="w-10 h-10 p-0 rounded-none"
                                                onClick={handleCancelVideo}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {generatedVideoUrl && (
                                        <div className="pt-5 border-t border-stone-800/40 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Output</span>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-medium rounded-none" onClick={() => window.open(generatedVideoUrl)}>
                                                    <Download className="w-3 h-3 mr-1" /> Open
                                                </Button>
                                            </div>
                                            <video
                                                src={generatedVideoUrl}
                                                controls
                                                className="w-full border border-primary/20"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Frame Picker Sidebar */}
                        <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                            <CardHeader className="p-4 border-b border-stone-800/40">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Select Frames</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 max-h-[600px] overflow-y-auto custom-scrollbar space-y-3">
                                {images.map((img, idx) => (
                                    <div key={idx} className="group bg-stone-950/50 border border-stone-800/60 p-2 space-y-2">
                                        <div 
                                            className="aspect-video overflow-hidden cursor-pointer relative"
                                            onClick={() => setPreviewImage(img)}
                                        >
                                            <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-stone-950/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Eye className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-7 text-[9px] font-bold uppercase rounded-none"
                                                onClick={() => setVideoStartImage(img)}
                                            >
                                                Start
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-7 text-[9px] font-bold uppercase rounded-none"
                                                onClick={() => setVideoEndImage(img)}
                                            >
                                                End
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- PUBLISH TAB --- */}
                <TabsContent 
                    value="edit" 
                    className="m-0 data-[state=inactive]:hidden"
                    forceMount
                >
                    <ImageEditor />
                </TabsContent>

                <TabsContent value="publish" className="m-0 flex flex-col gap-10">
                    {/* Tags Card */}
                    <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                        <CardHeader className="p-5 border-b border-stone-800/40">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest">SEO Tags</CardTitle>
                            <CardDescription className="text-[10px] font-medium text-stone-500">{tags.length}/13 tags used</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <Badge key={tag} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-colors flex gap-2 h-7 rounded-sm text-[10px] font-medium">
                                        {tag}
                                        <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add new tag..."
                                    className="bg-stone-950 border-stone-800 rounded-none"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && newTag.trim() && (setTags([...tags, newTag.trim()]), setNewTag(""))}
                                />
                                <Button 
                                    className="bg-stone-800 hover:bg-stone-700 rounded-none" 
                                    onClick={() => newTag.trim() && (setTags([...tags, newTag.trim()]), setNewTag(""))}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions Card */}
                    <Card className="bg-stone-900/50 border-stone-800/60 rounded-none overflow-hidden border-t-2 border-t-primary">
                        <CardHeader className="p-5">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest">Publish Actions</CardTitle>
                            <CardDescription className="text-[10px] font-medium text-stone-500">Connect your shop in settings to enable</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 pt-0 grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-12 font-bold uppercase tracking-wider text-[10px] rounded-none opacity-50 cursor-not-allowed !px-10">
                                Save Local
                            </Button>
                            <Button className="h-12 font-bold uppercase tracking-wider text-[10px] rounded-none opacity-50 cursor-not-allowed !px-10">
                                Publish
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Legal Footer */}
                    <div className="p-5 bg-stone-900/30 border border-stone-800/40 text-[9px] space-y-3 font-medium leading-relaxed">
                        <p className="text-stone-500">
                            The term 'Etsy' is a trademark of Etsy, Inc. This Application uses the Etsy API but is not endorsed or certified by Etsy.
                        </p>
                        <Separator className="bg-stone-800/40" />
                        <p className="text-stone-600">
                            DISCLAIMER: This application is provided exclusively by Amari Luigi. Etsy, Inc. and its affiliates are not the developer of this application and do not provide any warranties regarding the application or data accessed through it.
                        </p>
                    </div>
                </TabsContent>
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
                    onClick={() => setPreviewImage(null)}
                >
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-4 right-4 h-10 w-10 text-white hover:text-primary"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X className="w-6 h-6" />
                    </Button>
                    <img 
                        src={previewImage} 
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Comparison Preview Modal */}
            {comparisonPreview && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
                    onClick={() => { setComparisonPreview(null); setComparisonPosition(50); }}
                >
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-4 right-4 h-10 w-10 text-white hover:text-primary z-20"
                        onClick={() => { setComparisonPreview(null); setComparisonPosition(50); }}
                    >
                        <X className="w-6 h-6" />
                    </Button>
                    
                    {/* Labels */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-stone-950/80 text-xs font-bold uppercase text-stone-400 z-20">
                        Before
                    </div>
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-stone-950/80 text-xs font-bold uppercase text-primary z-20">
                        Move mouse to compare
                    </div>
                    <div className="absolute top-4 right-16 px-3 py-1.5 bg-stone-950/80 text-xs font-bold uppercase text-stone-400 z-20">
                        After
                    </div>
                    
                    {/* Comparison container */}
                    <div 
                        className="relative max-w-full max-h-full overflow-hidden cursor-col-resize"
                        onClick={(e) => e.stopPropagation()}
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percentage = (x / rect.width) * 100;
                            setComparisonPosition(Math.min(100, Math.max(0, percentage)));
                        }}
                    >
                        {/* After image (full) */}
                        <img 
                            src={comparisonPreview.after} 
                            className="max-w-[80vw] max-h-[80vh] object-contain"
                            draggable={false}
                        />
                        
                        {/* Before image (clipped) */}
                        <div 
                            className="absolute inset-0 overflow-hidden"
                            style={{ width: `${comparisonPosition}%` }}
                        >
                            <img 
                                src={comparisonPreview.before} 
                                className="max-w-[80vw] max-h-[80vh] object-contain"
                                draggable={false}
                            />
                        </div>
                        
                        {/* Divider line */}
                        <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                            style={{ left: `${comparisonPosition}%` }}
                        >
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <div className="flex gap-0.5">
                                    <ChevronFirst className="w-3 h-3 text-stone-900" />
                                    <ChevronLast className="w-3 h-3 text-stone-900" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Tabs>
    )
}
