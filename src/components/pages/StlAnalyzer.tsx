import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import StlVisualizer from "@/components/features/StlVisualizer"
import {
    Box,
    Upload,
    Scale,
    FileBox,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Layers,
    Move3D,
    Euro,
    Paintbrush,
    Package,
    Info,
    BarChart3,
    Settings,
    Gauge,
    Target,
    TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StlDimensions {
    width: number   // X axis
    height: number  // Y axis (usually the height for figures)
    depth: number   // Z axis
    unit: "mm" | "cm" | "inches"
}

interface ScaleInfo {
    scale: string
    heightMm: number
    heightCm: number
    heightInches: number
    humanHeight: string
    isMatch: boolean
}

interface StlAnalysis {
    fileName: string
    filePath: string
    fileSize: number
    dimensions: StlDimensions
    triangleCount: number
    volume: number // mm3
    surfaceArea: number // mm2
    scales: ScaleInfo[]
    bestMatch: ScaleInfo | null
    centerOfMass?: {
        x: number
        y: number
        z: number
        relativeX: number
        relativeY: number
        relativeZ: number
    }
    meshQuality?: {
        isWatertight: boolean
        watertightRatio: number
        openEdges: number
        nonManifoldEdges: number
        duplicateVertices: number
    }
    triangleStats?: {
        min: number
        max: number
        avg: number
    }
}

// Standard human figure scales (based on average human height of ~1750mm / 5'9")
const FIGURE_SCALES: { scale: string; humanHeightMm: number }[] = [
    { scale: "1/4", humanHeightMm: 437.5 },    // ~17.2 inches
    { scale: "1/5", humanHeightMm: 350 },      // ~13.8 inches
    { scale: "1/6", humanHeightMm: 291.7 },    // ~11.5 inches
    { scale: "1/7", humanHeightMm: 250 },      // ~9.8 inches
    { scale: "1/8", humanHeightMm: 218.75 },   // ~8.6 inches
    { scale: "1/10", humanHeightMm: 175 },     // ~6.9 inches
    { scale: "1/12", humanHeightMm: 145.8 },   // ~5.7 inches
    { scale: "1/16", humanHeightMm: 109.4 },   // ~4.3 inches
    { scale: "1/18", humanHeightMm: 97.2 },    // ~3.8 inches
    { scale: "1/24", humanHeightMm: 72.9 },    // ~2.9 inches
    { scale: "1/32", humanHeightMm: 54.7 },    // ~2.2 inches
    { scale: "1/35", humanHeightMm: 50 },      // ~2.0 inches
    { scale: "1/48", humanHeightMm: 36.5 },    // ~1.4 inches
    { scale: "1/72", humanHeightMm: 24.3 },    // ~1.0 inches
]

export default function StlAnalyzer() {
    const [analysis, setAnalysis] = useState<StlAnalysis | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [cachedStlDataUrl, setCachedStlDataUrl] = useState<string | null>(null)
    const [flipped, setFlipped] = useState(false)

    // Pricing State
    const [resinPricePerLiter, setResinPricePerLiter] = useState<string>("30")
    const [shippingCost, setShippingCost] = useState<string>("20")
    const [resinMarkup, setResinMarkup] = useState<string>("4") // 4x markup on material
    const [paintingHourlyRate, setPaintingHourlyRate] = useState<string>("12") // €/hour for painting
    const [paintingSpeedCm2PerHour, setPaintingSpeedCm2PerHour] = useState<string>("100") // cm2 per hour base speed

    // Pre-supported STL settings
    const [isPreSupported, setIsPreSupported] = useState<boolean>(false)
    const [supportPercent, setSupportPercent] = useState<string>("35") // % of surface that is supports
    const [resinDensity, setResinDensity] = useState<string>("1.15") // g/ml - resin density for weight calculation

    const calculateScales = (heightMm: number): { scales: ScaleInfo[], bestMatch: ScaleInfo | null } => {
        const scales: ScaleInfo[] = FIGURE_SCALES.map(s => {
            const tolerance = s.humanHeightMm * 0.15 // 15% tolerance
            const isMatch = Math.abs(heightMm - s.humanHeightMm) <= tolerance
            return {
                scale: s.scale,
                heightMm: s.humanHeightMm,
                heightCm: s.humanHeightMm / 10,
                heightInches: s.humanHeightMm / 25.4,
                humanHeight: `${(s.humanHeightMm / 10).toFixed(1)}cm`,
                isMatch
            }
        })

        // Find best match (closest scale)
        let bestMatch: ScaleInfo | null = null
        let minDiff = Infinity
        scales.forEach(s => {
            const diff = Math.abs(heightMm - s.heightMm)
            if (diff < minDiff) {
                minDiff = diff
                bestMatch = s
            }
        })

        return { scales, bestMatch }
    }

    const getAspectRatioAnalysis = (dimensions: StlDimensions) => {
        const { width, height, depth } = dimensions
        const ratios = {
            widthHeight: width / height,
            depthHeight: depth / height,
            widthDepth: width / depth
        }

        // Find the dominant dimension
        const maxDim = Math.max(width, height, depth)
        const orientation = maxDim === width ? 'X' : maxDim === height ? 'Y' : 'Z'

        // Check for extreme aspect ratios (>3:1 or <1:3)
        const isExtreme = ratios.widthHeight > 3 || ratios.widthHeight < 1/3 ||
                         ratios.depthHeight > 3 || ratios.depthHeight < 1/3 ||
                         ratios.widthDepth > 3 || ratios.widthDepth < 1/3

        // Suggest best orientation (tallest dimension should be Z for printing)
        const suggestion = maxDim === height ? 'optimal' : 'consider_rotation'

        return {
            ratios,
            orientation,
            isExtreme,
            suggestion,
            dominantDimension: maxDim
        }
    }

    const analyzeStl = async (filePath: string, fileName: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await window.electronAPI.analyzeStl(filePath)

            if (!result.success) {
                throw new Error(result.error || "Failed to analyze STL file")
            }

            const dimensions: StlDimensions = {
                width: result.dimensions.x,
                height: result.dimensions.z,  // Z is typically height in STL files
                depth: result.dimensions.y,
                unit: "mm"
            }

            // Use the largest dimension as "height" for scale calculation
            const maxDimension = Math.max(dimensions.width, dimensions.height, dimensions.depth)
            const { scales, bestMatch } = calculateScales(maxDimension)

            setAnalysis({
                fileName,
                filePath,
                fileSize: result.fileSize,
                dimensions,
                triangleCount: result.triangleCount,
                volume: result.volume,
                surfaceArea: result.surfaceArea,
                scales,
                bestMatch,
                centerOfMass: result.centerOfMass,
                meshQuality: result.meshQuality,
                triangleStats: result.triangleStats
            })

            // Cache the STL file data for visualization
            try {
                const base64 = await window.electronAPI.readStlFile(filePath)
                if (base64) {
                    // Convert base64 to ArrayBuffer, then to Blob, then to Object URL
                    const binaryString = atob(base64)
                    const bytes = new Uint8Array(binaryString.length)
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i)
                    }
                    const blob = new Blob([bytes], { type: 'application/octet-stream' })
                    const url = URL.createObjectURL(blob)
                    setCachedStlDataUrl(url)
                }
            } catch (cacheErr) {
                console.error('Failed to cache STL file:', cacheErr)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    const handleUnload = () => {
        // Revoke the cached blob URL
        if (cachedStlDataUrl) {
            URL.revokeObjectURL(cachedStlDataUrl)
            setCachedStlDataUrl(null)
        }
        setAnalysis(null)
        setError(null)
        setFlipped(false) // Reset flip state
    }

    const handleOpenFile = async () => {
        const result = await window.electronAPI.openStlDialog()
        if (result) {
            const fileName = result.split(/[/\\]/).pop() || "unknown.stl"
            await analyzeStl(result, fileName)
        }
    }

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        const stlFile = files.find(f => f.name.toLowerCase().endsWith('.stl'))

        if (stlFile) {
            const filePath = (stlFile as any).path
            if (filePath) {
                await analyzeStl(filePath, stlFile.name)
            }
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const formatFileSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
        }
        if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`
        }
        return `${bytes} bytes`
    }

    // Pricing Calculation Helpers
    const getResinCost = () => {
        if (!analysis) return 0
        const volumeMl = analysis.volume / 1000 // Convert mm3 to ml (cm3)
        const pricePerLiter = parseFloat(resinPricePerLiter) || 30
        const pricePerMl = pricePerLiter / 1000
        return volumeMl * pricePerMl
    }

    const getEstimates = () => {
        const rawResinCost = getResinCost()
        const shipping = parseFloat(shippingCost) || 20
        const markup = parseFloat(resinMarkup) || 4
        const hourlyRate = parseFloat(paintingHourlyRate) || 12
        const basePaintSpeed = parseFloat(paintingSpeedCm2PerHour) || 60 // cm2/hour

        const unpaintedPrice = (rawResinCost * markup) + shipping
        const baseUnpainted = rawResinCost * markup

        // Calculate painting time based on surface area and complexity
        let paintingHours = 0
        let complexityMultiplier = 1
        let triangleDensity = 0
        let effectiveSurfaceAreaCm2 = 0

        if (analysis && analysis.surfaceArea > 0) {
            const totalSurfaceAreaCm2 = analysis.surfaceArea / 100 // mm² to cm²

            // Reduce surface area if pre-supported (supports don't need painting)
            const supportReduction = isPreSupported ? (parseFloat(supportPercent) || 35) / 100 : 0
            effectiveSurfaceAreaCm2 = totalSurfaceAreaCm2 * (1 - supportReduction)

            // Triangle density = triangles per cm² (higher = more detailed)
            // Use effective surface for density calculation too
            triangleDensity = analysis.triangleCount * (1 - supportReduction) / effectiveSurfaceAreaCm2

            // Complexity multiplier using square root scaling (less aggressive than logarithmic)
            // This prevents over-tessellated models from inflating prices too much
            // ~100 tri/cm² = 1.0x, ~1000 tri/cm² = 1.32x, ~10000 tri/cm² = 1.58x
            // Cap at 1.5x to prevent excessive pricing for simple but high-poly models
            // For small models (< 50cm²), reduce complexity impact significantly
            const normalizedDensity = Math.max(triangleDensity, 10) / 100
            let baseComplexity = 1 + Math.sqrt(Math.min(normalizedDensity, 2.5)) * 0.2
            baseComplexity = Math.max(1, Math.min(baseComplexity, 1.5)) // Clamp 1x to 1.5x
            
            // Reduce complexity impact for small models - small parts are faster to paint regardless of detail
            // 50cm²+ = full complexity, 10cm² = 0.7x complexity impact, 1cm² = 0.5x complexity impact
            const sizeComplexityFactor = Math.min(1, Math.max(0.5, effectiveSurfaceAreaCm2 / 50))
            complexityMultiplier = 1 + (baseComplexity - 1) * sizeComplexityFactor

            // Size-based speed adjustment: smaller models paint slower per unit area
            // (smaller brushes needed, more precision required)
            // But don't penalize too harshly - cap minimum speed at 0.7x
            // 5cm = 0.7x, 10cm = 1.0x, 20cm = 1.3x, 40cm = 1.6x speed
            const modelHeightCm = analysis.dimensions.height / 10
            const sizeSpeedBonus = 1 + Math.log2(Math.max(modelHeightCm, 5) / 10) * 0.5
            const effectiveSpeed = basePaintSpeed * Math.max(sizeSpeedBonus, 0.7) // Cap minimum at 0.7x

            // Base painting time = surfaceArea / effectiveSpeed
            // Adjusted time = base time * complexity multiplier
            paintingHours = (effectiveSurfaceAreaCm2 / effectiveSpeed) * complexityMultiplier
        }

        const paintingCost = paintingHours * hourlyRate
        const paintedTotal = unpaintedPrice + paintingCost + shipping // unpainted + labor + extra shipping for fragile painted

        return {
            rawResinCost,
            baseUnpainted,
            unpaintedTotal: unpaintedPrice,
            paintingHours,
            paintingCost,
            complexityMultiplier,
            triangleDensity,
            paintedTotal
        }
    }

    const estimates = getEstimates()

    return (
        <div className="h-full flex flex-col p-6 gap-6">
            {/* Header */}
            <div className="shrink-0">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
                        <Box className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-stone-100 tracking-tight">STL Analyzer</h1>
                        <p className="text-xs text-stone-500">Analyze STL files to determine figure scale and price</p>
                    </div>
                </div>
            </div>

            {/* Error Message (outside tabs) */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-400">Error</p>
                        <p className="text-xs text-stone-400 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Tabs Container */}
            {!analysis ? (
                /* Drop Zone - Show when no file loaded */
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div
                        className={cn(
                            "w-full max-w-2xl min-h-[300px] border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-4 cursor-pointer",
                            isDragging
                                ? "border-violet-500 bg-violet-500/10"
                                : "border-stone-700/50 bg-stone-900/30 hover:border-stone-600 hover:bg-stone-900/50",
                            isLoading && "pointer-events-none opacity-50"
                        )}
                        onClick={handleOpenFile}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-12 h-12 text-violet-400 animate-spin" />
                                <span className="text-sm text-stone-400">Analyzing STL file...</span>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-stone-800/50 flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-stone-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-stone-300 font-medium">
                                        Drop STL file here
                                    </p>
                                    <p className="text-xs text-stone-500 mt-1">
                                        or click to browse
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-4 bg-stone-900/60 h-12 p-1 border border-stone-800/60 shrink-0">
                        <TabsTrigger value="overview" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
                            <Info className="w-3.5 h-3.5" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="details" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
                            <BarChart3 className="w-3.5 h-3.5" /> Details
                        </TabsTrigger>
                        <TabsTrigger value="pricing" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
                            <Euro className="w-3.5 h-3.5" /> Pricing
                        </TabsTrigger>
                        <TabsTrigger value="scales" className="flex gap-2 font-bold uppercase tracking-wide text-[10px] data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
                            <Scale className="w-3.5 h-3.5" /> Scales
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                        <TabsContent value="overview" className="flex-1 mt-4 space-y-4">
                            {/* 3D Visualizer */}
                            <StlVisualizer dataUrl={cachedStlDataUrl} flipped={flipped} onFlipChange={setFlipped} onClose={handleUnload} />

                            {/* File Info */}
                            <div className="bg-stone-900/50 border border-stone-800/60 rounded-lg p-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <FileBox className="w-5 h-5 text-violet-400" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-stone-200 truncate">
                                        {analysis.fileName}
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        {formatFileSize(analysis.fileSize)} • {analysis.triangleCount.toLocaleString()} triangles
                                    </p>
                                </div>
                                <Badge variant="outline" className="border-violet-500/40 text-violet-400 bg-violet-500/5">
                                    STL
                                </Badge>
                            </div>

                            <Separator className="bg-stone-800/60" />

                            {/* Dimensions Grid */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-wider">
                                    <Move3D className="w-3.5 h-3.5" />
                                    <span>Dimensions</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-stone-800/40 rounded p-3 text-center">
                                        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Width (X)</p>
                                        <p className="text-lg font-bold text-stone-200 tabular-nums">
                                            {analysis.dimensions.width.toFixed(1)}
                                        </p>
                                        <p className="text-[10px] text-stone-500">mm</p>
                                    </div>
                                    <div className="bg-stone-800/40 rounded p-3 text-center">
                                        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Depth (Y)</p>
                                        <p className="text-lg font-bold text-stone-200 tabular-nums">
                                            {analysis.dimensions.depth.toFixed(1)}
                                        </p>
                                        <p className="text-[10px] text-stone-500">mm</p>
                                    </div>
                                    <div className="bg-violet-500/10 border border-violet-500/30 rounded p-3 text-center">
                                        <p className="text-[10px] text-violet-400 uppercase tracking-wider mb-1">Height (Z)</p>
                                        <p className="text-lg font-bold text-violet-300 tabular-nums">
                                            {analysis.dimensions.height.toFixed(1)}
                                        </p>
                                        <p className="text-[10px] text-violet-400">mm</p>
                                    </div>
                                </div>
                            </div>

                                {/* Volume Info */}
                                <div className="bg-stone-800/30 rounded p-3 flex justify-between items-center">
                                    <span className="text-xs text-stone-400">Estimated Volume</span>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-stone-200">
                                            {(analysis.volume / 1000).toFixed(2)} ml
                                        </span>
                                    </div>
                                </div>

                                {/* Weight */}
                                <div className="bg-stone-800/30 rounded p-3 flex justify-between items-center">
                                    <span className="text-xs text-stone-400">Estimated Weight</span>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-stone-200">
                                            {(() => {
                                                const volumeMl = analysis.volume / 1000
                                                const density = parseFloat(resinDensity) || 1.15
                                                return (volumeMl * density).toFixed(1)
                                            })()}g
                                        </span>
                                    </div>
                                </div>

                                {/* Surface Area */}
                                <div className="bg-stone-800/30 rounded p-3 flex justify-between items-center">
                                    <span className="text-xs text-stone-400">Surface Area</span>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-stone-200">
                                            {(analysis.surfaceArea / 100).toFixed(1)} cm²
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Best Match Card */}
                            {analysis.bestMatch && (
                                <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/30 rounded-lg p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle2 className="w-5 h-5 text-violet-400" />
                                        <span className="text-sm font-medium text-violet-300">Best Match</span>
                                    </div>
                                    <div className="text-center py-4">
                                        <p className="text-5xl font-black text-white mb-2">
                                            {analysis.bestMatch.scale}
                                        </p>
                                        <p className="text-sm text-stone-400">
                                            Standard height: {analysis.bestMatch.heightCm.toFixed(1)} cm / {analysis.bestMatch.heightInches.toFixed(1)}"
                                        </p>
                                    </div>
                                    <Separator className="bg-violet-500/20 my-4" />
                                    <div className="flex justify-between text-xs text-stone-400">
                                        <span>Your model height (Z):</span>
                                        <span className="font-medium text-stone-200">
                                            {analysis.dimensions.height.toFixed(1)} mm ({(analysis.dimensions.height / 10).toFixed(1)} cm)
                                        </span>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="details" className="flex-1 mt-4 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Mesh Quality Card */}
                                {analysis.meshQuality && (
                                    <Card className="bg-stone-900/50 border-stone-800/60">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-8 h-8 rounded flex items-center justify-center",
                                                    analysis.meshQuality.isWatertight
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : "bg-amber-500/20 text-amber-400"
                                                )}>
                                                    <Layers className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-sm font-bold">Mesh Quality</CardTitle>
                                                    <CardDescription className="text-xs">Structural integrity analysis</CardDescription>
                                                </div>
                                                {analysis.meshQuality.isWatertight ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-amber-400" />
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className={cn(
                                                "rounded-lg p-3 border",
                                                analysis.meshQuality.isWatertight
                                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                                    : "bg-amber-500/10 border-amber-500/30"
                                            )}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-stone-200">Watertight</span>
                                                    <Badge variant={analysis.meshQuality.isWatertight ? "default" : "destructive"} className="text-xs">
                                                        {analysis.meshQuality.isWatertight ? "Yes" : "No"}
                                                    </Badge>
                                                </div>
                                                {!analysis.meshQuality.isWatertight && (
                                                    <div className="space-y-1.5 mt-2 pt-2 border-t border-stone-700/50">
                                                        {analysis.meshQuality.openEdges > 0 && (
                                                            <div className="flex justify-between text-xs text-stone-400">
                                                                <span>Open edges:</span>
                                                                <span className="text-amber-400 font-medium">{analysis.meshQuality.openEdges}</span>
                                                            </div>
                                                        )}
                                                        {analysis.meshQuality.nonManifoldEdges > 0 && (
                                                            <div className="flex justify-between text-xs text-stone-400">
                                                                <span>Non-manifold edges:</span>
                                                                <span className="text-amber-400 font-medium">{analysis.meshQuality.nonManifoldEdges}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {analysis.meshQuality.duplicateVertices > 0 && (
                                                    <div className="flex justify-between text-xs text-stone-400 mt-2 pt-2 border-t border-stone-700/50">
                                                        <span>Duplicate vertices:</span>
                                                        <span className="text-amber-400 font-medium">{analysis.meshQuality.duplicateVertices}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Orientation Analysis Card */}
                                {analysis.dimensions && (() => {
                                    const aspectAnalysis = getAspectRatioAnalysis(analysis.dimensions)
                                    return (
                                        <Card className="bg-stone-900/50 border-stone-800/60">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded bg-violet-500/20 text-violet-400 flex items-center justify-center">
                                                        <Scale className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <CardTitle className="text-sm font-bold">Orientation</CardTitle>
                                                        <CardDescription className="text-xs">Aspect ratio analysis</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {aspectAnalysis.isExtreme && (
                                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                                                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="text-xs font-medium text-amber-400">Extreme Aspect Ratio</p>
                                                            <p className="text-[10px] text-amber-400/70 mt-1">
                                                                Consider rotating model for better print quality
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="bg-stone-800/30 rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-stone-500 uppercase mb-1">W:H</div>
                                                        <div className="text-sm font-bold text-stone-200">{aspectAnalysis.ratios.widthHeight.toFixed(2)}</div>
                                                    </div>
                                                    <div className="bg-stone-800/30 rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-stone-500 uppercase mb-1">D:H</div>
                                                        <div className="text-sm font-bold text-stone-200">{aspectAnalysis.ratios.depthHeight.toFixed(2)}</div>
                                                    </div>
                                                    <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-violet-400 uppercase mb-1">Axis</div>
                                                        <div className="text-sm font-bold text-violet-300">{aspectAnalysis.orientation}</div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })()}

                                {/* Center of Mass Card */}
                                {analysis.centerOfMass && (
                                    <Card className="bg-stone-900/50 border-stone-800/60">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                                    <Target className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-sm font-bold">Center of Mass</CardTitle>
                                                    <CardDescription className="text-xs">Balance point location</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-stone-800/30 rounded-lg p-3 text-center">
                                                    <div className="text-[9px] text-stone-500 uppercase mb-1">X Axis</div>
                                                    <div className="text-lg font-bold text-stone-200">{analysis.centerOfMass.relativeX.toFixed(1)}%</div>
                                                </div>
                                                <div className="bg-stone-800/30 rounded-lg p-3 text-center">
                                                    <div className="text-[9px] text-stone-500 uppercase mb-1">Y Axis</div>
                                                    <div className="text-lg font-bold text-stone-200">{analysis.centerOfMass.relativeY.toFixed(1)}%</div>
                                                </div>
                                                <div className="bg-stone-800/30 rounded-lg p-3 text-center">
                                                    <div className="text-[9px] text-stone-500 uppercase mb-1">Z Axis</div>
                                                    <div className="text-lg font-bold text-stone-200">{analysis.centerOfMass.relativeZ.toFixed(1)}%</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Triangle Statistics Card */}
                                {analysis.triangleStats && (
                                    <Card className="bg-stone-900/50 border-stone-800/60">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                                    <Layers className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-sm font-bold">Triangle Stats</CardTitle>
                                                    <CardDescription className="text-xs">Mesh density metrics</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center py-2 border-b border-stone-800/40">
                                                    <span className="text-xs text-stone-400">Minimum area</span>
                                                    <span className="text-sm font-bold text-stone-200">{analysis.triangleStats.min.toFixed(4)} mm²</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-stone-800/40">
                                                    <span className="text-xs text-stone-400">Maximum area</span>
                                                    <span className="text-sm font-bold text-stone-200">{analysis.triangleStats.max.toFixed(2)} mm²</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2">
                                                    <span className="text-xs text-stone-400">Average area</span>
                                                    <span className="text-sm font-bold text-stone-200">{analysis.triangleStats.avg.toFixed(4)} mm²</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Print Volume Utilization - Full Width */}
                            {analysis.dimensions && analysis.volume > 0 && (() => {
                                const printerSizes = [
                                    { name: "Standard", size: "192×120×200mm", volume: 192 * 120 * 200 },
                                    { name: "Medium", size: "250×210×210mm", volume: 250 * 210 * 210 },
                                    { name: "Large", size: "300×300×400mm", volume: 300 * 300 * 400 }
                                ]
                                return (
                                    <Card className="bg-stone-900/50 border-stone-800/60">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                    <Gauge className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-sm font-bold">Print Volume Utilization</CardTitle>
                                                    <CardDescription className="text-xs">Model size vs printer capacity</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {printerSizes.map((printer) => {
                                                    const utilization = (analysis.volume / printer.volume) * 100
                                                    return (
                                                        <div key={printer.name} className="bg-stone-800/30 rounded-lg p-3 border border-stone-700/50">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <div>
                                                                    <div className="text-xs font-medium text-stone-300">{printer.name}</div>
                                                                    <div className="text-[10px] text-stone-500">{printer.size}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-bold text-stone-200">{utilization.toFixed(1)}%</div>
                                                                </div>
                                                            </div>
                                                            <Progress value={Math.min(utilization, 100)} className="h-2" />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })()}
                        </TabsContent>

                        <TabsContent value="pricing" className="flex-1 mt-4 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Configuration Card */}
                                <Card className="lg:col-span-1 bg-stone-900/50 border-stone-800/60">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                <Settings className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-sm font-bold">Configuration</CardTitle>
                                                <CardDescription className="text-xs">Pricing parameters</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Material Settings */}
                                        <div className="space-y-3">
                                            <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">Material</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase text-stone-500">Resin (€/L)</Label>
                                                    <Input
                                                        type="number"
                                                        value={resinPricePerLiter}
                                                        onChange={(e) => setResinPricePerLiter(e.target.value)}
                                                        className="h-8 bg-stone-900 border-stone-800 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase text-stone-500">Markup (x)</Label>
                                                    <Input
                                                        type="number"
                                                        value={resinMarkup}
                                                        onChange={(e) => setResinMarkup(e.target.value)}
                                                        className="h-8 bg-stone-900 border-stone-800 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase text-stone-500">Resin Density (g/ml)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={resinDensity}
                                                    onChange={(e) => setResinDensity(e.target.value)}
                                                    className="h-8 bg-stone-900 border-stone-800 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <Separator className="bg-stone-800/60" />

                                        {/* Painting Settings */}
                                        <div className="space-y-3">
                                            <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">Painting</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase text-stone-500">Rate (€/hr)</Label>
                                                    <Input
                                                        type="number"
                                                        value={paintingHourlyRate}
                                                        onChange={(e) => setPaintingHourlyRate(e.target.value)}
                                                        className="h-8 bg-stone-900 border-stone-800 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase text-stone-500">Speed (cm²/hr)</Label>
                                                    <Input
                                                        type="number"
                                                        value={paintingSpeedCm2PerHour}
                                                        onChange={(e) => setPaintingSpeedCm2PerHour(e.target.value)}
                                                        className="h-8 bg-stone-900 border-stone-800 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Separator className="bg-stone-800/60" />

                                        {/* Shipping & Options */}
                                        <div className="space-y-3">
                                            <div className="text-xs font-medium text-stone-400 uppercase tracking-wider">Options</div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase text-stone-500">Shipping (€)</Label>
                                                <Input
                                                    type="number"
                                                    value={shippingCost}
                                                    onChange={(e) => setShippingCost(e.target.value)}
                                                    className="h-8 bg-stone-900 border-stone-800 text-xs"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-stone-800/30 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    id="preSupported"
                                                    checked={isPreSupported}
                                                    onChange={(e) => setIsPreSupported(e.target.checked)}
                                                    className="w-4 h-4 rounded border-stone-600 bg-stone-800 text-violet-500 focus:ring-violet-500"
                                                />
                                                <label htmlFor="preSupported" className="text-xs text-stone-300 cursor-pointer flex-1">
                                                    Pre-Supported STL
                                                </label>
                                                {isPreSupported && (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            value={supportPercent}
                                                            onChange={(e) => setSupportPercent(e.target.value)}
                                                            className="h-6 w-14 bg-stone-900 border-stone-700 text-xs text-center"
                                                        />
                                                        <span className="text-[10px] text-stone-500">%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Results Card */}
                                <Card className="lg:col-span-2 bg-stone-900/50 border-stone-800/60">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded bg-violet-500/20 text-violet-400 flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-sm font-bold">Price Estimation</CardTitle>
                                                <CardDescription className="text-xs">Calculated pricing breakdown</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Model Stats */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-stone-800/30 rounded-lg p-3 text-center border border-stone-700/50">
                                                <div className="text-[9px] text-stone-500 uppercase mb-1">Surface Area</div>
                                                <div className="text-lg font-bold text-stone-200">{(analysis.surfaceArea / 100).toFixed(1)} cm²</div>
                                            </div>
                                            <div className="bg-stone-800/30 rounded-lg p-3 text-center border border-stone-700/50">
                                                <div className="text-[9px] text-stone-500 uppercase mb-1">Triangle Density</div>
                                                <div className="text-lg font-bold text-stone-200">{estimates.triangleDensity.toFixed(0)}/cm²</div>
                                            </div>
                                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                                                <div className="text-[9px] text-amber-400 uppercase mb-1">Complexity</div>
                                                <div className="text-lg font-bold text-amber-400">{estimates.complexityMultiplier.toFixed(1)}x</div>
                                            </div>
                                        </div>

                                        <Separator className="bg-stone-800/60" />

                                        {/* Cost Breakdown */}
                                        <div className="space-y-2">
                                            <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Cost Breakdown</div>
                                            <div className="flex justify-between items-center text-xs text-stone-400 py-1">
                                                <span>Raw Material Cost</span>
                                                <span className="text-stone-300 font-medium">€{estimates.rawResinCost.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <Separator className="bg-stone-800/60" />

                                        {/* Price Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Unpainted Price */}
                                            <div className="bg-stone-900 rounded-lg p-4 border border-stone-800/60">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Package className="w-4 h-4 text-stone-400" />
                                                    <span className="text-sm font-bold text-stone-300">Unpainted</span>
                                                </div>
                                                <div className="mb-3">
                                                    <div className="text-xs text-stone-500 mb-1">Total Price</div>
                                                    <div className="text-3xl font-black text-white">
                                                        €{estimates.unpaintedTotal.toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] text-stone-500 mt-1">
                                                        (Material × {resinMarkup}) + Shipping
                                                    </div>
                                                </div>
                                                {(() => {
                                                    const volumeMl = analysis.volume / 1000
                                                    const density = parseFloat(resinDensity) || 1.15
                                                    const weightG = volumeMl * density
                                                    const materialCost = estimates.rawResinCost * parseFloat(resinMarkup) || 0
                                                    const materialPercent = estimates.unpaintedTotal > 0 ? (materialCost / estimates.unpaintedTotal) * 100 : 0
                                                    return (
                                                        <div className="pt-3 border-t border-stone-800/60 space-y-2">
                                                            <div className="flex justify-between text-xs text-stone-400">
                                                                <span>Weight</span>
                                                                <span className="text-stone-300 font-medium">{weightG.toFixed(1)}g</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-stone-400">
                                                                <span>Material Cost</span>
                                                                <span className="text-stone-300 font-medium">€{materialCost.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-stone-400">
                                                                <span>Material %</span>
                                                                <span className="text-stone-300 font-medium">{materialPercent.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}
                                            </div>

                                            {/* Painted Price */}
                                            <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/30 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Paintbrush className="w-4 h-4 text-violet-400" />
                                                        <span className="text-sm font-bold text-violet-300">Painted</span>
                                                    </div>
                                                    <Badge variant="outline" className="border-violet-500/40 text-violet-400 text-[9px]">
                                                        ~{estimates.paintingHours.toFixed(1)}h
                                                    </Badge>
                                                </div>
                                                <div className="mb-3">
                                                    <div className="text-xs text-violet-400/70 mb-1">Total Price</div>
                                                    <div className="text-3xl font-black text-violet-200">
                                                        €{estimates.paintedTotal.toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] text-violet-400/70 mt-1">
                                                        Unpainted + Labor (€{estimates.paintingCost.toFixed(0)}) + Shipping
                                                    </div>
                                                </div>
                                                {(() => {
                                                    const volumeMl = analysis.volume / 1000
                                                    const density = parseFloat(resinDensity) || 1.15
                                                    const weightG = volumeMl * density
                                                    const materialCost = estimates.rawResinCost * parseFloat(resinMarkup) || 0
                                                    const materialPercent = estimates.paintedTotal > 0 ? (materialCost / estimates.paintedTotal) * 100 : 0
                                                    return (
                                                        <div className="pt-3 border-t border-violet-500/20 space-y-2">
                                                            <div className="flex justify-between text-xs text-violet-400/70">
                                                                <span>Weight</span>
                                                                <span className="text-violet-300 font-medium">{weightG.toFixed(1)}g</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-violet-400/70">
                                                                <span>Material Cost</span>
                                                                <span className="text-violet-300 font-medium">€{materialCost.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-violet-400/70">
                                                                <span>Material %</span>
                                                                <span className="text-violet-300 font-medium">{materialPercent.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="scales" className="flex-1 mt-4 space-y-4">
                            {/* Best Match Highlight */}
                            {analysis.bestMatch && (
                                <Card className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border-violet-500/30">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-base font-bold text-violet-300">Best Match Scale</CardTitle>
                                                <CardDescription className="text-xs text-violet-400/70">Recommended scale for this model</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center py-4">
                                            <div className="text-6xl font-black text-white mb-2">
                                                {analysis.bestMatch.scale}
                                            </div>
                                            <div className="text-sm text-stone-400 mb-4">
                                                Standard height: {analysis.bestMatch.heightCm.toFixed(1)} cm ({analysis.bestMatch.heightInches.toFixed(1)}")
                                            </div>
                                            <Separator className="bg-violet-500/20 mb-4" />
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-stone-400">Your model height (Z):</span>
                                                <span className="font-bold text-stone-200">
                                                    {analysis.dimensions.height.toFixed(1)} mm ({(analysis.dimensions.height / 10).toFixed(1)} cm)
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* All Scales List */}
                            <Card className="bg-stone-900/50 border-stone-800/60">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-stone-800/50 text-stone-400 flex items-center justify-center">
                                            <Scale className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-sm font-bold">Scale Reference</CardTitle>
                                            <CardDescription className="text-xs">All available scales with pricing</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                                        <div className="divide-y divide-stone-800/40">
                                        {analysis.scales.map((scaleInfo) => {
                                            // Use the MAXIMUM dimension as "model height" since STL orientation varies
                                            const actualModelHeight = Math.max(
                                                analysis.dimensions.width,
                                                analysis.dimensions.height,
                                                analysis.dimensions.depth
                                            )
                                            const diff = actualModelHeight - scaleInfo.heightMm
                                            const matchPercent = Math.max(0, 100 - Math.abs(diff / scaleInfo.heightMm) * 100)
                                            const isBestMatch = analysis.bestMatch?.scale === scaleInfo.scale

                                            // Scale ratio based on actual maximum dimension
                                            const ratio = scaleInfo.heightMm / actualModelHeight

                                            // Volume scales with cube of linear dimension
                                            const scaledVolumeMm3 = analysis.volume * Math.pow(ratio, 3)
                                            const scaledVolumeMl = scaledVolumeMm3 / 1000

                                            // Calculate weight (g) based on volume and resin density
                                            const density = parseFloat(resinDensity) || 1.15
                                            const scaledWeightG = scaledVolumeMl * density

                                            // Surface area scales with square of linear dimension
                                            // Apply support reduction if pre-supported
                                            const supportReduction = isPreSupported ? (parseFloat(supportPercent) || 35) / 100 : 0
                                            const scaledSurfaceAreaMm2 = analysis.surfaceArea * Math.pow(ratio, 2) * (1 - supportReduction)
                                            const scaledSurfaceAreaCm2 = scaledSurfaceAreaMm2 / 100

                                            // Pricing inputs
                                            const resinPrice = parseFloat(resinPricePerLiter) || 30
                                            const markup = parseFloat(resinMarkup) || 4
                                            const shipping = parseFloat(shippingCost) || 20
                                            const hourlyRate = parseFloat(paintingHourlyRate) || 12
                                            const paintSpeed = parseFloat(paintingSpeedCm2PerHour) || 60

                                            // Calculate unpainted price
                                            const rawCost = scaledVolumeMl * (resinPrice / 1000)
                                            const unpaintedPrice = (rawCost * markup) + shipping

                                            // Calculate painted price using square root complexity (matches main calculation)
                                            // Use ORIGINAL triangle density (not scaled) - detail level is inherent to the model
                                            const originalSurfaceAreaCm2 = analysis.surfaceArea / 100
                                            const originalTriangleDensity = originalSurfaceAreaCm2 > 0 ? analysis.triangleCount / originalSurfaceAreaCm2 : 0
                                            const normalizedDensity = Math.max(originalTriangleDensity, 10) / 100
                                            let baseComplexity = 1 + Math.sqrt(Math.min(normalizedDensity, 2.5)) * 0.2
                                            baseComplexity = Math.max(1, Math.min(baseComplexity, 1.5)) // Clamp 1x to 1.5x
                                            
                                            // Reduce complexity impact for small scaled models
                                            const sizeComplexityFactor = Math.min(1, Math.max(0.5, scaledSurfaceAreaCm2 / 50))
                                            let complexityMult = 1 + (baseComplexity - 1) * sizeComplexityFactor

                                            // Size-based speed adjustment for scaled models
                                            // Smaller models need more precision, but cap minimum at 0.7x
                                            const scaledHeightCm = scaleInfo.heightMm / 10
                                            const sizeSpeedBonus = 1 + Math.log2(Math.max(scaledHeightCm, 5) / 10) * 0.5
                                            const effectiveSpeed = paintSpeed * Math.max(sizeSpeedBonus, 0.7) // Cap minimum at 0.7x

                                            const paintHours = (scaledSurfaceAreaCm2 / effectiveSpeed) * complexityMult
                                            const paintCost = paintHours * hourlyRate
                                            const paintedPrice = unpaintedPrice + paintCost

                                            return (
                                                <div
                                                    key={scaleInfo.scale}
                                                    className={cn(
                                                        "p-4 transition-all rounded-lg border",
                                                        isBestMatch
                                                            ? "bg-violet-500/10 border-violet-500/30"
                                                            : "border-stone-800/40 hover:border-stone-700/60 hover:bg-stone-800/20"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg",
                                                                isBestMatch
                                                                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                                                                    : "bg-stone-800/50 text-stone-300 border border-stone-700/50"
                                                            )}>
                                                                {scaleInfo.scale}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={cn(
                                                                        "text-sm font-bold",
                                                                        isBestMatch ? "text-violet-300" : "text-stone-300"
                                                                    )}>
                                                                        {scaleInfo.humanHeight}
                                                                    </span>
                                                                    {isBestMatch && (
                                                                        <Badge className="h-5 px-2 text-[9px] bg-violet-500/20 text-violet-300 border-violet-500/40">
                                                                            BEST MATCH
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-stone-500">
                                                                    {scaleInfo.heightCm.toFixed(1)}cm / {scaleInfo.heightInches.toFixed(1)}"
                                                                    {diff !== 0 && (
                                                                        <span className={cn(
                                                                            "ml-2",
                                                                            Math.abs(diff) < 10 ? "text-emerald-400" : "text-amber-400"
                                                                        )}>
                                                                            ({diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}mm)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="flex items-center gap-4">
                                                                <div>
                                                                    <div className="text-[9px] text-stone-500 uppercase mb-1">Unpainted</div>
                                                                    <div className="text-lg font-bold text-emerald-400">
                                                                        €{unpaintedPrice.toFixed(0)}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[9px] text-violet-400 uppercase mb-1">Painted</div>
                                                                    <div className="text-lg font-bold text-violet-300">
                                                                        €{paintedPrice.toFixed(0)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <Progress
                                                        value={matchPercent}
                                                        className={cn(
                                                            "h-2 mb-2",
                                                            isBestMatch ? "[&>div]:bg-violet-500" : "[&>div]:bg-stone-600"
                                                        )}
                                                    />
                                                    
                                                    <div className="flex justify-between items-center text-xs">
                                                        <div className="flex items-center gap-4 text-stone-400">
                                                            <span>Match: <span className="text-stone-300 font-medium">{matchPercent.toFixed(0)}%</span></span>
                                                            <span>Weight: <span className="text-stone-300 font-medium">{scaledWeightG.toFixed(1)}g</span></span>
                                                            <span>Volume: <span className="text-stone-300 font-medium">{scaledVolumeMl.toFixed(1)}ml</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            )}
        </div>
    )
}

