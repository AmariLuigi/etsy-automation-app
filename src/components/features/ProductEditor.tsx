import { useState, useEffect } from "react"
import type { FolderAnalysis } from "../../types/electron"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    Monitor
} from "lucide-react"

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
    const [processedImages, setProcessedImages] = useState<{ name: string; url: string }[]>([])
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

        const results: { name: string; url: string }[] = []

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
                    results.push({ name: img.name, url: result.imageUrl })
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
        <Tabs defaultValue="info" className="w-full animate-fade-in-up">
            <TabsList className="grid w-full grid-cols-5 bg-stone-900 h-14 p-1 border border-stone-800">
                <TabsTrigger value="info" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Info className="w-4 h-4" /> Info
                </TabsTrigger>
                <TabsTrigger value="description" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <FileText className="w-4 h-4" /> Description
                </TabsTrigger>
                <TabsTrigger value="images" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <ImageIcon className="w-4 h-4" /> Images
                </TabsTrigger>
                <TabsTrigger value="video" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Video className="w-4 h-4" /> Video
                </TabsTrigger>
                <TabsTrigger value="publish" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Rocket className="w-4 h-4" /> Publish
                </TabsTrigger>
            </TabsList>

            <div className="mt-20 animate-fade-in pr-2">
                <TabsContent value="info" className="m-0 pt-10">
                    <div className="grid grid-cols-6 gap-8">
                        {/* 1. Folder Name */}
                        <Card className="col-span-4 bg-stone-900 border-stone-800 p-10 flex flex-col items-center justify-center text-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-4 block">Product Folder</label>
                            <h3 className="text-2xl font-black text-stone-100 uppercase tracking-tight truncate w-full">{folderData.folderName}</h3>
                        </Card>

                        {/* 2. Total Files */}
                        <Card className="col-span-2 bg-stone-900 border-stone-800 p-10 flex flex-col items-center justify-center text-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2">Total Files</label>
                            <div className="text-4xl font-black text-primary leading-none">{folderData.totalFiles}</div>
                        </Card>

                        {/* 3. Detected Formats */}
                        <Card className="col-span-3 bg-stone-900 border-stone-800 p-10 flex flex-col items-center justify-center text-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-6 block leading-none">Detected Formats</label>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {Object.entries(folderData.fileTypes).map(([ext, count]) => (
                                    <Badge key={ext} variant="secondary" className="px-4 py-1.5 bg-stone-800 border-stone-700 text-stone-200 text-[10px] font-bold">
                                        .{ext.toUpperCase()} ({count})
                                    </Badge>
                                ))}
                            </div>
                        </Card>

                        {/* 4. Total Size */}
                        <Card className="col-span-3 bg-stone-900 border-stone-800 p-10 flex flex-col items-center justify-center text-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-6 block leading-none">Library Weight</label>
                            <div className="flex flex-col items-center">
                                <h4 className="text-3xl font-black text-stone-200 leading-none">{sizeGB} <span className="text-sm font-bold text-stone-700 ml-1">GB</span></h4>
                            </div>
                        </Card>

                        {/* 5. Product Title Input */}
                        <Card className="col-span-6 bg-stone-900 border-stone-800 p-10 flex flex-col items-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6 block leading-none">Listing Title (Optimized)</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-stone-950 border-stone-800 h-16 text-lg font-black tracking-tight px-6 focus-visible:ring-primary/20 text-center"
                            />
                        </Card>

                        {/* 6. AI Instructions */}
                        <Card className="col-span-6 bg-stone-900 border-stone-800 p-10 flex flex-col items-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6 block leading-none">Instruction Overwrite</label>
                            <Textarea
                                value={specialInstructions}
                                onChange={(e) => setSpecialInstructions(e.target.value)}
                                className="bg-stone-950 border-stone-800 resize-none h-40 p-6 text-stone-300 font-medium leading-relaxed focus-visible:ring-primary/20 text-center"
                                placeholder="Add specific technical details, printer recommendations, or artist credits..."
                            />
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="description" className="m-0 pt-10">
                    <Card className="bg-stone-900 border-stone-800 h-full">
                        <CardHeader className="flex flex-row items-center justify-between p-10 pb-6">
                            <div>
                                <CardTitle className="text-base font-black uppercase tracking-[0.15em]">Product Description</CardTitle>
                                <CardDescription className="text-xs font-medium text-stone-500">Generated Etsy content</CardDescription>
                            </div>
                            <Button onClick={handleRegenerateAI} disabled={isRegenerating} variant="outline" className="border-primary text-primary hover:bg-primary/10 h-10 px-6 text-[11px] font-black uppercase tracking-widest transition-all">
                                {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Regenerate AI
                            </Button>
                        </CardHeader>
                        <CardContent className="px-10 pb-10">
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-stone-950 border-stone-800 font-mono text-sm min-h-[400px]"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- IMAGES / WATERMARK TAB --- */}
                <TabsContent value="images" className="space-y-6 m-0">
                    <div className="grid grid-cols-3 gap-6">
                        {/* Process Section */}
                        <div className="col-span-2 space-y-6">
                            <Card className="bg-stone-900 border-stone-800">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Watermark Removal Pro</CardTitle>
                                    <CardDescription className="text-xs">Queue images to clean them of watermarks</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Drop Target */}
                                    <div
                                        className="border-2 border-dashed border-stone-800 bg-stone-950/50 p-10 text-center hover:border-primary transition-colors cursor-pointer"
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
                                        <p className="text-xs font-bold uppercase text-stone-200 tracking-tight">Click or Drag images here</p>
                                        <p className="text-[10px] text-stone-500 uppercase mt-2">JPG, PNG, WebP • AI Powered</p>
                                    </div>

                                    {/* Queue */}
                                    {uploadedImages.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                                <span>Queue ({uploadedImages.length})</span>
                                                <button onClick={() => setUploadedImages([])} className="text-destructive hover:underline">Clear</button>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {uploadedImages.map((img, idx) => (
                                                    <div key={idx} className="relative aspect-square border border-stone-800 bg-stone-950 overflow-hidden group">
                                                        <img src={img.base64} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                                        <button
                                                            onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                                                            className="absolute top-1 right-1 bg-stone-950/80 p-1 text-white opacity-0 group-hover:opacity-100"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button
                                                className="w-full font-bold uppercase tracking-tight"
                                                onClick={handleBatchWatermarkRemoval}
                                                disabled={isProcessingWatermarks}
                                            >
                                                {isProcessingWatermarks ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                Process Batch
                                            </Button>
                                            {isProcessingWatermarks && (
                                                <div className="space-y-2">
                                                    <Progress value={(watermarkProgress.current / watermarkProgress.total) * 100} className="h-1 bg-stone-800" />
                                                    <p className="text-[10px] text-center text-stone-500 font-bold uppercase">Processing Image {watermarkProgress.current} unit...</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Results */}
                                    {processedImages.length > 0 && (
                                        <div className="space-y-4 pt-4 border-t border-stone-800">
                                            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-2 h-2 bg-primary animate-pulse" /> Final Results
                                            </CardTitle>
                                            <div className="grid grid-cols-4 gap-3">
                                                {processedImages.map((img, idx) => (
                                                    <div key={idx} className="relative aspect-square border border-primary/20 bg-stone-950 overflow-hidden group">
                                                        <img src={img.url} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary"><Download className="w-4 h-4" /></Button>
                                                            <Button onClick={() => setProcessedImages(prev => prev.filter((_, i) => i !== idx))} size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Source Column */}
                        <div className="space-y-6">
                            <Card className="bg-stone-900 border-stone-800">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Source Folder</CardTitle>
                                        <Button
                                            variant="link"
                                            className="h-auto p-0 text-[10px] uppercase font-bold text-primary"
                                            onClick={() => images.forEach((img, idx) => addFolderImageToQueue(img, idx))}
                                        >
                                            Add All
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                    {loadingImages ? (
                                        <div className="flex justify-center py-10 text-stone-600"><Loader2 className="animate-spin w-5 h-5" /></div>
                                    ) : images.map((img, idx) => (
                                        <div key={idx} className="flex gap-3 bg-stone-950 border border-stone-800 p-2 group hover:border-primary/50 transition-colors">
                                            <div className="w-12 h-12 bg-stone-900 flex-shrink-0 overflow-hidden">
                                                <img src={img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-stone-300 truncate tracking-tight uppercase">Product {idx + 1}</p>
                                                <button
                                                    onClick={() => addFolderImageToQueue(img, idx)}
                                                    className="flex items-center gap-1 text-[9px] font-bold uppercase text-stone-500 hover:text-primary mt-1"
                                                >
                                                    <Plus className="w-2.5 h-2.5" /> Push to Queue
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- VIDEO TAB --- */}
                <TabsContent value="video" className="m-0 space-y-6">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-6">
                            <Card className="bg-stone-900 border-stone-800">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-sm font-bold uppercase tracking-widest">WanVideo I2V</CardTitle>
                                            <CardDescription className="text-xs">Generate a 360° showcase video</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="border-primary text-primary text-[10px] font-bold px-3">WAN 2.1</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Preview Area */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">First Frame</p>
                                            <div className="aspect-square bg-stone-950 border border-stone-800 flex items-center justify-center overflow-hidden">
                                                {videoStartImage ? (
                                                    <img src={videoStartImage} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Monitor className="w-8 h-8 text-stone-800" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Last Frame</p>
                                            <div className="aspect-square bg-stone-950 border border-stone-800 flex items-center justify-center overflow-hidden">
                                                {videoEndImage ? (
                                                    <img src={videoEndImage} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Monitor className="w-8 h-8 text-stone-800" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Config Grid */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Width</label>
                                            <Input type="number" value={videoWidth} onChange={(e) => setVideoWidth(parseInt(e.target.value))} className="bg-stone-950 border-stone-800 h-10" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Height</label>
                                            <Input type="number" value={videoHeight} onChange={(e) => setVideoHeight(parseInt(e.target.value))} className="bg-stone-950 border-stone-800 h-10" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Frames</label>
                                            <Input type="number" value={videoFrames} onChange={(e) => setVideoFrames(parseInt(e.target.value))} className="bg-stone-950 border-stone-800 h-10" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Video Prompt</label>
                                        <Textarea
                                            value={videoPrompt}
                                            onChange={(e) => setVideoPrompt(e.target.value)}
                                            className="bg-stone-950 border-stone-800 h-20 resize-none text-xs"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            className="grow h-12 font-bold uppercase tracking-widest relative overflow-hidden"
                                            onClick={handleGenerateVideo}
                                            disabled={isGeneratingVideo}
                                        >
                                            {isGeneratingVideo ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Generating... ({formatTime(videoTimer)})
                                                    <div className="absolute bottom-0 left-0 h-1 bg-primary/30 animate-pulse w-full" />
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Generate Video Content
                                                </>
                                            )}
                                        </Button>

                                        {isGeneratingVideo && (
                                            <Button
                                                variant="destructive"
                                                className="w-12 h-12 p-0"
                                                onClick={handleCancelVideo}
                                                title="Cancel Generation"
                                            >
                                                <X className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>

                                    {generatedVideoUrl && (
                                        <div className="pt-6 border-t border-stone-800 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-xs font-bold uppercase tracking-widest">Output Video</CardTitle>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={() => window.open(generatedVideoUrl)}>
                                                    <Download className="w-3 h-3 mr-1" /> Open Source
                                                </Button>
                                            </div>
                                            <video
                                                src={generatedVideoUrl}
                                                controls
                                                className="w-full border border-primary/20 shadow-lg shadow-primary/5"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Image Picker */}
                        <div className="space-y-6">
                            <Card className="bg-stone-900 border-stone-800">
                                <CardHeader>
                                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Pick Frames</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="group bg-stone-950 border border-stone-800 p-2 space-y-2">
                                            <div className="aspect-video overflow-hidden">
                                                <img src={img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-7 text-[9px] font-bold uppercase"
                                                    onClick={() => setVideoStartImage(img)}
                                                >
                                                    Set Start
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-7 text-[9px] font-bold uppercase"
                                                    onClick={() => setVideoEndImage(img)}
                                                >
                                                    Set End
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- PUBLISH TAB --- */}
                <TabsContent value="publish" className="m-0 space-y-6">
                    <Card className="bg-stone-900 border-stone-800">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-widest">SEO Meta Tags</CardTitle>
                            <CardDescription className="text-xs">{tags.length}/13 Tags used</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <Badge key={tag} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all flex gap-2 h-7 rounded-none">
                                        {tag}
                                        <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter new search tag..."
                                    className="bg-stone-950 border-stone-800"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && (setTags([...tags, newTag]), setNewTag(""))}
                                />
                                <Button className="bg-stone-800 border-stone-700 hover:bg-stone-700" onClick={() => (setTags([...tags, newTag]), setNewTag(""))}>
                                    <Plus className="w-4 h-4 mr-1" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-stone-900 border-stone-800 overflow-hidden ring-1 ring-primary/20">
                        <div className="h-1 bg-primary w-full" />
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-widest">Final Actions</CardTitle>
                            <CardDescription className="text-xs">Connect your shop in settings to enable direct publishing</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 pb-8">
                            <Button variant="outline" className="h-14 font-bold uppercase tracking-widest opacity-50 cursor-not-allowed">
                                Save Local Copy
                            </Button>
                            <Button className="h-14 font-bold uppercase tracking-widest opacity-50 cursor-not-allowed">
                                Ship to Marketplace
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </div>
        </Tabs>
    )
}
