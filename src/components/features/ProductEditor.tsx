import { useState, useEffect, useCallback } from "react"
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
    Pencil,
    Send,
    ShoppingBag,
    Copy,
    Check,
    Clipboard,
    FolderDown,
    FileDown,
    Link,
    Star,
    Upload,
    FolderOpen,
    Package
} from "lucide-react"
import ImageEditor from "./ImageEditor"
import ListingPreview, { type ListingMedia } from "./ListingPreview"

interface ProductEditorProps {
    folderData: FolderAnalysis
    generatedContent: {
        title: string
        description: string
        tags: string[]
    } | null
    onContentChange: (content: { title: string; description: string; tags: string[] } | null) => void
    productType: 'physical' | 'digital'
}

export default function ProductEditor({ folderData, generatedContent, onContentChange, productType }: ProductEditorProps) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [tags, setTags] = useState<string[]>([])
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
    const [videoDuration, setVideoDuration] = useState(5)
    const [videoPrompt, setVideoPrompt] = useState("360 camera movement of a static action figure showcase.")
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
    const [videoTimer, setVideoTimer] = useState(0)
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

    // Image preview state
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [comparisonPreview, setComparisonPreview] = useState<{ before: string; after: string } | null>(null)

    // Listing media state
    const [listingImages, setListingImages] = useState<ListingMedia[]>([])
    const [listingVideo, setListingVideo] = useState<ListingMedia | null>(null)

    const MAX_LISTING_IMAGES = 10
    const [comparisonPosition, setComparisonPosition] = useState(50)

    // Copy Command Center state
    const [copiedField, setCopiedField] = useState<string | null>(null)

    // Digital Product Generator state
    const [digitalTemplate, setDigitalTemplate] = useState(`Thank you for purchasing {product_title}!

📦 YOUR DOWNLOAD LINK:
{drive_link}

📁 This pack contains {product_file_count} files ({product_size}).

⭐ LEAVE A REVIEW:
Your feedback helps us grow! If you're happy with your purchase, please take a moment to leave a review on Etsy.

💬 NEED HELP?
Contact us through Etsy messages if you have any questions.

Thank you for your support!
- {shop_name}`)
    const [driveLink, setDriveLink] = useState('')
    const [isGeneratingLink, setIsGeneratingLink] = useState(false)
    const [generatedDigitalFile, setGeneratedDigitalFile] = useState<string | null>(null)
    const [sourceFolder, setSourceFolder] = useState<string | null>(null)
    const [isUploadingToDrive, setIsUploadingToDrive] = useState(false)

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
                for (const imgPath of folderData.images) {
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

            // Extract clean product name (remove numeric prefixes)
            const cleanName = folderData.folderName.replace(/^\d+\s*[-–]\s*/, '').trim()

            // Different LLM instructions based on product type
            const llmInstructions = productType === 'digital'
                ? `You are an expert Etsy listing writer for 3D PRINTING FILES (STL digital downloads).

**TITLE:** [Under 140 chars: character, franchise, 'STL', '3D Print Files', file count]

**DESCRIPTION:**
🎮 [CHARACTER] from [FRANCHISE] - Premium 3D Printable Figure! 🎮

✨ WHAT'S INCLUDED ✨
📁 ${folderData.totalFiles} high-quality files (${sizeGB} GB)
📐 Formats: ${fileTypesList}
🔧 Pre-supported and ready to print!

🖨️ PRINT READY: Optimized for resin/FDM, test printed
📋 SPECS: Scalable, 0.05mm layer height recommended

⚠️ DIGITAL FILE - No physical item shipped. Personal use only.

**TAGS:** [13 short tags: '[char] stl', '[franchise] stl', '[char] 3d print', 'stl files', etc.]

**MATERIALS:** Digital File, STL, 3D Print Files`
                : `You are an expert Etsy listing writer for PHYSICAL 3D PRINTED FIGURES (shipped products).

**TITLE:** [Under 140 chars: character, franchise, 'Figure', 'Statue', 'Resin'. NO 'STL' or 'digital'. NO size.]

**DESCRIPTION:**
🎮 [CHARACTER] from [FRANCHISE] - Premium 3D Printed Figure! 🎮

📦 WHAT YOU'LL RECEIVE:
★ High-quality resin 3D printed [CHARACTER] figure
★ Printed with premium 8K resin  
★ Professionally cleaned and UV cured
★ Size options available in dropdown

⏱️ PROCESSING: 10 business days (handmade to order)
📦 SHIPPING: 3-5 business days worldwide with tracking
🎨 PAINTING: Add-on service available

⚠️ PHYSICAL PRODUCT - Will be shipped to you. Unpainted unless painting option selected. Select size from dropdown.

**TAGS:** [13 short tags: '[char] figure', '[char] statue', 'resin figure', 'anime figure', 'collectible'. NO 'stl' or 'digital']

**MATERIALS:** Resin, 3D Printed Figure, Handmade

IMPORTANT: Do NOT specify a size in inches. The buyer selects size from a dropdown.`

            // Map data to the specific nodes in your workflow JSON
            const nodeInfo = [
                { node_id: "1", field_name: "instructions", value: llmInstructions }, // Override LLM instructions
                { node_id: "10", field_name: "text", value: cleanName },
                { node_id: "11", field_name: "text", value: folderData.parentFolder },
                { node_id: "12", field_name: "text", value: productType === 'digital' ? `${folderData.totalFiles} STL Files` : 'Physical Resin Figure' },
                { node_id: "13", field_name: "text", value: productType === 'digital' ? `${sizeGB} GB` : 'Premium 8K Resin' },
                { node_id: "14", field_name: "text", value: productType === 'digital' ? fileTypesList : 'Resin Print' },
                { node_id: "15", field_name: "text", value: productType === 'digital' ? 'Digital download, instant access' : '10 days processing, 3-5 days shipping worldwide' }
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
        const videoWebappId = localStorage.getItem("videoWorkflowId") || "2010074568173555714"

        if (!apiKey) {
            alert("Configuration Error: Please set your RunningHub API Key in Settings.")
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

            // Use the full fileName as returned by upload (including api/ prefix if present)
            const startFileName = startUpload.fileName || "";
            const endFileName = endUpload.fileName || "";

            // 2. Map to new AI-App API format with nodeInfoList
            const nodeInfoList = [
                { nodeId: "30", fieldName: "image", fieldValue: startFileName, description: "First frame image" },
                { nodeId: "44", fieldName: "image", fieldValue: endFileName, description: "Tail frame image" },
                { nodeId: "31", fieldName: "value", fieldValue: videoPrompt || "", description: "Prompt" },
                { nodeId: "28", fieldName: "value", fieldValue: videoWidth.toString(), description: "Video width" },
                { nodeId: "29", fieldName: "value", fieldValue: videoHeight.toString(), description: "Video height" },
                { nodeId: "13", fieldName: "value", fieldValue: videoDuration.toString(), description: "Duration in seconds" }
            ]

            console.log("🚀 Step 2: Requesting video generation with nodeInfoList:", nodeInfoList);

            const result = await window.electronAPI.generateVideoAiApp({
                apiKey,
                webappId: videoWebappId,
                instanceType: "plus",
                nodeInfoList
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

    // Listing media handlers
    const addImageToListing = useCallback((url: string, id?: string) => {
        if (listingImages.length >= MAX_LISTING_IMAGES) {
            alert(`Maximum of ${MAX_LISTING_IMAGES} images allowed per listing.`)
            return false
        }
        const newImage: ListingMedia = {
            id: id || `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'image',
            url
        }
        setListingImages(prev => [...prev, newImage])
        return true
    }, [listingImages.length])

    const addVideoToListing = useCallback((url: string) => {
        if (listingVideo) {
            const confirmed = window.confirm("A video is already added. Replace it?")
            if (!confirmed) return false
        }

        // Create a hidden video element to capture first frame as thumbnail
        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        video.src = url
        video.muted = true

        video.onloadeddata = () => {
            video.currentTime = 0
        }

        video.onseeked = () => {
            // Capture first frame using canvas
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth || 320
            canvas.height = video.videoHeight || 180
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const thumbnail = canvas.toDataURL('image/png')

                const newVideo: ListingMedia = {
                    id: `vid-${Date.now()}`,
                    type: 'video',
                    url,
                    thumbnail
                }
                setListingVideo(newVideo)
            }
        }

        video.onerror = () => {
            // If thumbnail capture fails, add video without thumbnail
            const newVideo: ListingMedia = {
                id: `vid-${Date.now()}`,
                type: 'video',
                url
            }
            setListingVideo(newVideo)
        }

        video.load()
        return true
    }, [listingVideo])

    const removeImageFromListing = useCallback((id: string) => {
        setListingImages(prev => prev.filter(img => img.id !== id))
    }, [])

    const removeVideoFromListing = useCallback(() => {
        setListingVideo(null)
    }, [])

    // Copy Command Center functions
    const copyToClipboard = useCallback((text: string, fieldName: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(fieldName)
        setTimeout(() => setCopiedField(null), 2000)
    }, [])

    const handleSaveAllMedia = useCallback(async () => {
        const allMedia = [...listingImages]
        if (listingVideo) allMedia.push(listingVideo)

        if (allMedia.length === 0) {
            alert("No media to save. Add images or video to the listing first.")
            return
        }

        try {
            // Request folder selection from Electron
            const folderPath = await window.electronAPI?.selectFolder()
            if (!folderPath) return

            // Save each media file
            for (let i = 0; i < allMedia.length; i++) {
                const media = allMedia[i]
                const extension = media.type === 'video' ? 'mp4' : 'png'
                const filename = `listing_${media.type}_${i + 1}.${extension}`

                // Convert base64/url to buffer and save
                await window.electronAPI?.saveFile(folderPath, filename, media.url)
            }

            alert(`Saved ${allMedia.length} file(s) to ${folderPath}`)
        } catch (error) {
            console.error("Error saving media:", error)
            alert("Failed to save media files")
        }
    }, [listingImages, listingVideo])

    // Digital Product Generator functions
    const generateDriveLink = useCallback(async () => {
        const productName = folderData.folderName
        const remotePath = `remote:${productName}`

        setIsGeneratingLink(true)
        try {
            const result = await window.electronAPI?.rcloneGenerateLink(remotePath)
            if (result?.success && result.link) {
                setDriveLink(result.link)
            } else {
                alert(`Failed to generate link: ${result?.error || 'Unknown error'}`)
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setIsGeneratingLink(false)
        }
    }, [folderData.folderName])

    const generateDigitalFile = useCallback(() => {
        // Calculate size in readable format
        const sizeBytes = folderData.totalSize
        const sizeGB = (sizeBytes / (1024 * 1024 * 1024)).toFixed(2)
        const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2)
        const sizeFormatted = sizeBytes > 1024 * 1024 * 1024 ? `${sizeGB} GB` : `${sizeMB} MB`

        // Replace template placeholders
        let content = digitalTemplate
            .replace(/{product_title}/g, title || folderData.folderName)
            .replace(/{product_name}/g, folderData.folderName)
            .replace(/{product_file_count}/g, folderData.totalFiles.toString())
            .replace(/{product_size}/g, sizeFormatted)
            .replace(/{drive_link}/g, driveLink || '[LINK NOT GENERATED]')
            .replace(/{shop_name}/g, 'Your Shop') // TODO: Make configurable

        setGeneratedDigitalFile(content)
    }, [digitalTemplate, title, folderData, driveLink])

    const selectSourceFolder = useCallback(async () => {
        const folder = await window.electronAPI?.selectFolder()
        if (folder) {
            setSourceFolder(folder)
        }
    }, [])

    const uploadToDrive = useCallback(async () => {
        if (!sourceFolder) {
            alert('Please select a source folder first')
            return
        }

        // Extract folder name from path
        const folderName = sourceFolder.split('\\').pop() || sourceFolder.split('/').pop() || 'product'
        const remotePath = `remote:${folderName}`

        setIsUploadingToDrive(true)
        try {
            const result = await window.electronAPI?.rcloneCopyToDrive(sourceFolder, remotePath)
            if (result?.success) {
                alert(`Successfully uploaded to Google Drive!\nRemote path: ${remotePath}`)
                // Auto-generate link after upload
                const linkResult = await window.electronAPI?.rcloneGenerateLink(remotePath)
                if (linkResult?.success && linkResult.link) {
                    setDriveLink(linkResult.link)
                }
            } else {
                alert(`Upload failed: ${result?.error || 'Unknown error'}`)
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setIsUploadingToDrive(false)
        }
    }, [sourceFolder])

    return (
        <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-7 bg-stone-900/60 h-12 p-1 border border-stone-800/60 rounded-none">
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
                <TabsTrigger value="listing" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <ShoppingBag className="w-3.5 h-3.5" /> Listing
                </TabsTrigger>
                <TabsTrigger value="publish" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Rocket className="w-3.5 h-3.5" /> Publish
                </TabsTrigger>
            </TabsList>

            <div className="mt-8 animate-fade-in">
                <TabsContent value="info" className="m-0 flex flex-col gap-10">
                    {/* Product Type Badge */}
                    <div className="flex items-center justify-center">
                        <div className={`flex items-center gap-2 px-6 py-2.5 font-bold uppercase tracking-wider text-[10px] ${productType === 'digital'
                            ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                            : 'bg-primary/20 text-primary border border-primary/50'
                            }`}>
                            {productType === 'digital' ? <FileDown className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                            {productType === 'digital' ? 'Digital Product' : 'Physical Product'}
                        </div>
                    </div>

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

                <TabsContent value="images" className="m-0 flex flex-col gap-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                        {/* Main Processing Section */}
                        <div className="lg:col-span-2 h-full">
                            <Card className="bg-stone-900/50 border-stone-800/60 rounded-none h-full flex flex-col">
                                <CardHeader className="!pl-6 !pr-10 py-5 border-b border-stone-800/40">
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Watermark Removal</CardTitle>
                                    <CardDescription className="text-xs font-medium text-stone-500">Queue images for AI processing</CardDescription>
                                </CardHeader>
                                <CardContent className="!pl-6 !pr-10 py-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
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
                                        <div className="space-y-4 mt-6">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Queue ({uploadedImages.length})</span>
                                                <button onClick={() => setUploadedImages([])} className="text-xs font-medium text-destructive hover:underline">Clear</button>
                                            </div>
                                            <div className={`grid gap-3 ${uploadedImages.length <= 2 ? 'grid-cols-2' :
                                                uploadedImages.length <= 4 ? 'grid-cols-3' :
                                                    uploadedImages.length <= 6 ? 'grid-cols-4' : 'grid-cols-5'
                                                }`}>
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
                                        </div>
                                    )}

                                    {/* Spacer to push button to bottom */}
                                    <div className="flex-1 min-h-6" />

                                    {/* Process Button - always at bottom when queue exists */}
                                    {uploadedImages.length > 0 && (
                                        <div className="space-y-4">
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
                                        <div className="space-y-4 pt-6 mt-6 border-t border-stone-800/40">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-primary rounded-full" />
                                                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Results ({processedImages.length})</span>
                                                    <span className="text-[10px] text-stone-600 ml-2">Click to compare</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="h-7 text-[10px] font-bold uppercase rounded-none"
                                                    onClick={() => {
                                                        processedImages.forEach(img => addImageToListing(img.url))
                                                    }}
                                                >
                                                    <Send className="w-3 h-3 mr-1" /> Send All to Listing
                                                </Button>
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
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 bg-stone-950/80 hover:text-primary" onClick={(e) => { e.stopPropagation(); addImageToListing(img.url); }} title="Send to Listing"><Send className="w-3 h-3" /></Button>
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
                        <Card className="bg-stone-900/50 border-stone-800/60 rounded-none h-full flex flex-col">
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
                            <CardContent className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
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
                                            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Duration (sec)</label>
                                            <Input type="number" value={videoDuration} onChange={(e) => setVideoDuration(parseInt(e.target.value))} className="bg-stone-950 border-stone-800 h-9 text-sm rounded-none" />
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
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="default" className="h-7 text-[10px] font-bold uppercase rounded-none" onClick={() => addVideoToListing(generatedVideoUrl)}>
                                                        <Send className="w-3 h-3 mr-1" /> Send to Listing
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-[10px] font-medium rounded-none" onClick={() => window.open(generatedVideoUrl)}>
                                                        <Download className="w-3 h-3 mr-1" /> Open
                                                    </Button>
                                                </div>
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
                    <ImageEditor onSendToListing={addImageToListing} />
                </TabsContent>

                {/* --- LISTING TAB --- */}
                <TabsContent value="listing" className="m-0">
                    <ListingPreview
                        title={title}
                        description={description}
                        tags={tags}
                        onTagsChange={setTags}
                        images={listingImages}
                        video={listingVideo}
                        onRemoveImage={removeImageFromListing}
                        onRemoveVideo={removeVideoFromListing}
                    />
                </TabsContent>

                <TabsContent value="publish" className="m-0 flex flex-col gap-6">
                    {/* Copy Command Center */}
                    <Card className="bg-stone-900/50 border-stone-800/60 rounded-none overflow-hidden border-t-2 border-t-primary">
                        <CardHeader className="p-5">
                            <div className="flex items-center gap-3">
                                <Clipboard className="w-5 h-5 text-primary" />
                                <div>
                                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Copy Command Center</CardTitle>
                                    <CardDescription className="text-[10px] font-medium text-stone-500">One-click copy for Etsy web form</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 pt-0 space-y-4">
                            {/* Copy Buttons Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Copy Title */}
                                <Button
                                    variant="outline"
                                    className={`h-16 flex flex-col gap-1.5 font-bold uppercase tracking-wider text-[10px] rounded-none transition-all ${copiedField === 'title' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-stone-700 hover:border-primary'
                                        }`}
                                    onClick={() => copyToClipboard(title, 'title')}
                                    disabled={!title}
                                >
                                    {copiedField === 'title' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    {copiedField === 'title' ? 'Copied!' : 'Copy Title'}
                                </Button>

                                {/* Copy Description */}
                                <Button
                                    variant="outline"
                                    className={`h-16 flex flex-col gap-1.5 font-bold uppercase tracking-wider text-[10px] rounded-none transition-all ${copiedField === 'description' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-stone-700 hover:border-primary'
                                        }`}
                                    onClick={() => copyToClipboard(description, 'description')}
                                    disabled={!description}
                                >
                                    {copiedField === 'description' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    {copiedField === 'description' ? 'Copied!' : 'Copy Description'}
                                </Button>

                                {/* Copy Tags */}
                                <Button
                                    variant="outline"
                                    className={`h-16 flex flex-col gap-1.5 font-bold uppercase tracking-wider text-[10px] rounded-none transition-all ${copiedField === 'tags' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-stone-700 hover:border-primary'
                                        }`}
                                    onClick={() => copyToClipboard(tags.join(', '), 'tags')}
                                    disabled={tags.length === 0}
                                >
                                    {copiedField === 'tags' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    {copiedField === 'tags' ? 'Copied!' : `Copy Tags (${tags.length})`}
                                </Button>
                            </div>

                            {/* Preview of what will be copied */}
                            <div className="bg-stone-950/50 border border-stone-800/60 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                                    <Eye className="w-3 h-3" />
                                    Preview
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-stone-300 truncate"><span className="text-stone-500">Title:</span> {title || <span className="italic text-stone-600">Not set</span>}</p>
                                    <p className="text-xs text-stone-300 truncate"><span className="text-stone-500">Description:</span> {description ? `${description.slice(0, 60)}...` : <span className="italic text-stone-600">Not set</span>}</p>
                                    <p className="text-xs text-stone-300 truncate"><span className="text-stone-500">Tags:</span> {tags.length > 0 ? tags.slice(0, 5).join(', ') + (tags.length > 5 ? '...' : '') : <span className="italic text-stone-600">None</span>}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Media Card */}
                    <Card className="bg-stone-900/50 border-stone-800/60 rounded-none overflow-hidden">
                        <CardHeader className="p-5">
                            <div className="flex items-center gap-3">
                                <FolderDown className="w-5 h-5 text-primary" />
                                <div>
                                    <CardTitle className="text-xs font-bold uppercase tracking-widest">Export Media</CardTitle>
                                    <CardDescription className="text-[10px] font-medium text-stone-500">
                                        {listingImages.length} image(s), {listingVideo ? '1 video' : '0 videos'} in listing
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                            <Button
                                variant="outline"
                                className="w-full h-12 font-bold uppercase tracking-wider text-[10px] rounded-none border-stone-700 hover:border-primary"
                                onClick={handleSaveAllMedia}
                                disabled={listingImages.length === 0 && !listingVideo}
                            >
                                <FolderDown className="w-4 h-4 mr-2" />
                                Save All Media to Folder
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Digital Product Generator - Only for Digital Products */}
                    {productType === 'digital' && (
                        <Card className="bg-stone-900/50 border-stone-800/60 rounded-none overflow-hidden border-t-2 border-t-green-500">
                            <CardHeader className="p-5">
                                <div className="flex items-center gap-3">
                                    <FileDown className="w-5 h-5 text-green-500" />
                                    <div>
                                        <CardTitle className="text-sm font-bold uppercase tracking-widest">Digital Product File</CardTitle>
                                        <CardDescription className="text-[10px] font-medium text-stone-500">Generate the text file buyers receive</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 pt-0 space-y-4">
                                {/* Source Folder Selection & Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">1. Select & Upload to Drive</label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 flex-1 border-stone-700 hover:border-green-500 text-xs"
                                            onClick={selectSourceFolder}
                                        >
                                            <FolderOpen className="w-4 h-4 mr-2" />
                                            {sourceFolder ? sourceFolder.split('\\').pop() : 'Select Folder...'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 px-4 border-stone-700 hover:border-green-500 bg-green-600/20"
                                            onClick={uploadToDrive}
                                            disabled={!sourceFolder || isUploadingToDrive}
                                        >
                                            {isUploadingToDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    {sourceFolder && (
                                        <p className="text-[9px] text-stone-600 truncate">Path: {sourceFolder}</p>
                                    )}
                                </div>

                                {/* Drive Link Section */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">2. Google Drive Link</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={driveLink}
                                            onChange={(e) => setDriveLink(e.target.value)}
                                            placeholder="Auto-generated after upload or paste manually..."
                                            className="flex-1 h-9 text-xs bg-stone-950 border-stone-800"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 px-3 border-stone-700 hover:border-green-500"
                                            onClick={generateDriveLink}
                                            disabled={isGeneratingLink}
                                            title="Generate link for existing folder"
                                        >
                                            {isGeneratingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[9px] text-stone-600">Remote path: remote:{sourceFolder?.split('\\').pop() || folderData.folderName}</p>
                                </div>

                                {/* Template Editor */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Template</label>
                                        <div className="flex gap-1 flex-wrap">
                                            {['{product_title}', '{product_file_count}', '{product_size}', '{drive_link}', '{shop_name}'].map(tag => (
                                                <Badge key={tag} variant="outline" className="text-[8px] font-mono border-stone-700 text-stone-500 cursor-pointer hover:text-green-400 hover:border-green-500"
                                                    onClick={() => setDigitalTemplate(prev => prev + ' ' + tag)}
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <Textarea
                                        value={digitalTemplate}
                                        onChange={(e) => setDigitalTemplate(e.target.value)}
                                        className="min-h-[200px] text-xs font-mono bg-stone-950 border-stone-800"
                                        placeholder="Enter your template..."
                                    />
                                </div>

                                {/* Generate Button */}
                                <Button
                                    className="w-full h-10 font-bold uppercase tracking-wider text-[10px] rounded-none bg-green-600 hover:bg-green-500"
                                    onClick={generateDigitalFile}
                                >
                                    <Star className="w-4 h-4 mr-2" />
                                    Generate Digital File
                                </Button>

                                {/* Generated Output */}
                                {generatedDigitalFile && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-green-500">Generated Output</label>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[10px]"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(generatedDigitalFile)
                                                    setCopiedField('digital')
                                                    setTimeout(() => setCopiedField(null), 2000)
                                                }}
                                            >
                                                {copiedField === 'digital' ? <Check className="w-3 h-3 mr-1 text-green-400" /> : <Copy className="w-3 h-3 mr-1" />}
                                                {copiedField === 'digital' ? 'Copied!' : 'Copy'}
                                            </Button>
                                        </div>
                                        <pre className="bg-stone-950 border border-green-500/30 p-4 text-[11px] font-mono text-stone-300 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                                            {generatedDigitalFile}
                                        </pre>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

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
