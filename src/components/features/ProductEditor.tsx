import { useState, useEffect } from "react"
import type { FolderAnalysis } from "../../types/electron"
import { cn } from "@/lib/utils"
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
    FileBox,
    Download,
    Trash2,
    Plus,
    X,
    Loader2,
    Activity,
    Trash
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
    const [listingTone, setListingTone] = useState<"hype" | "professional">("hype")
    const [isRegenerating, setIsRegenerating] = useState(false)

    // Watermark removal state
    const [uploadedImages, setUploadedImages] = useState<{ name: string; base64: string }[]>([])
    const [processedImages, setProcessedImages] = useState<{ name: string; url: string }[]>([])
    const [isProcessingWatermarks, setIsProcessingWatermarks] = useState(false)
    const [watermarkProgress, setWatermarkProgress] = useState({ current: 0, total: 0 })

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
        const nodeId = localStorage.getItem("promptNodeId") || "5"
        const fieldName = localStorage.getItem("promptFieldName") || "text"

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

    return (
        <Tabs defaultValue="info" className="w-full animate-fade-in-up">
            <TabsList className="grid w-full grid-cols-4 bg-stone-900 h-14 p-1 border border-stone-800">
                <TabsTrigger value="info" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Info className="w-4 h-4" /> Info
                </TabsTrigger>
                <TabsTrigger value="description" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <FileText className="w-4 h-4" /> Description
                </TabsTrigger>
                <TabsTrigger value="images" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <ImageIcon className="w-4 h-4" /> Images
                </TabsTrigger>
                <TabsTrigger value="publish" className="flex gap-2 font-bold uppercase tracking-tight text-[11px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Rocket className="w-4 h-4" /> Publish
                </TabsTrigger>
            </TabsList>

            <div className="mt-6 h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                {/* --- INFO TAB --- */}
                <TabsContent value="info" className="space-y-6 m-0">
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="bg-stone-900 border-stone-800">
                            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                                <div className="p-2 bg-primary/10 text-primary"><FileBox className="w-5 h-5" /></div>
                                <div>
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Folder Details</CardTitle>
                                    <CardDescription className="text-xs">Physical attributes of the product</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0 text-sm">
                                <div className="flex justify-between border-b border-stone-800 pb-2">
                                    <span className="text-stone-500">Name</span>
                                    <span className="font-bold text-stone-200">{folderData.folderName}</span>
                                </div>
                                <div className="flex justify-between border-b border-stone-800 pb-2">
                                    <span className="text-stone-500">Total Files</span>
                                    <span className="font-bold text-primary">{folderData.totalFiles}</span>
                                </div>
                                <div className="flex justify-between border-stone-800 pb-2">
                                    <span className="text-stone-500">Total Size</span>
                                    <span className="font-bold text-stone-200">{sizeGB} GB</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-stone-900 border-stone-800">
                            <CardHeader className="flex flex-row items-center gap-3 space-y-0 text-white">
                                <div className="p-2 bg-stone-800"><Activity className="w-5 h-5" /></div>
                                <div>
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Format Summary</CardTitle>
                                    <CardDescription className="text-xs">Detected file extensions</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2 pt-0">
                                {Object.entries(folderData.fileTypes).map(([ext, count]) => (
                                    <Badge key={ext} variant="secondary" className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200">
                                        .{ext.toUpperCase()} ({count})
                                    </Badge>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-stone-900 border-stone-800">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-widest">AI Customization</CardTitle>
                            <CardDescription className="text-xs">Special instructions for the listing generation</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Product Title</label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-stone-950 border-stone-800 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Instruction Overwrite</label>
                                <Textarea
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
                                    className="bg-stone-950 border-stone-800 resize-none h-24"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- DESCRIPTION TAB --- */}
                <TabsContent value="description" className="m-0">
                    <Card className="bg-stone-900 border-stone-800 h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold uppercase tracking-widest">Product Description</CardTitle>
                                <CardDescription className="text-xs">Generated Etsy content</CardDescription>
                            </div>
                            <Button onClick={handleRegenerateAI} disabled={isRegenerating} variant="outline" className="border-primary text-primary hover:bg-primary/10 h-8 text-[11px] font-bold uppercase tracking-tight">
                                {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                                Regenerate AI
                            </Button>
                        </CardHeader>
                        <CardContent>
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
