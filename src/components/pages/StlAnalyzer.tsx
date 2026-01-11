import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    Package
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

    // Pricing State
    const [resinPricePerLiter, setResinPricePerLiter] = useState<string>("30")
    const [shippingCost, setShippingCost] = useState<string>("20")
    const [resinMarkup, setResinMarkup] = useState<string>("4") // 4x markup on material
    const [paintingHourlyRate, setPaintingHourlyRate] = useState<string>("12") // €/hour for painting
    const [paintingSpeedCm2PerHour, setPaintingSpeedCm2PerHour] = useState<string>("60") // cm2 per hour base speed

    // Pre-supported STL settings
    const [isPreSupported, setIsPreSupported] = useState<boolean>(false)
    const [supportPercent, setSupportPercent] = useState<string>("35") // % of surface that is supports

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
                bestMatch
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred")
        } finally {
            setIsLoading(false)
        }
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
        const basePaintSpeed = parseFloat(paintingSpeedCm2PerHour) || 15 // cm2/hour

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

            // Complexity multiplier using logarithmic scaling
            // This handles both low-poly and high-poly models reasonably
            // ~100 tri/cm² = 1.0x, ~1000 tri/cm² = 1.5x, ~10000 tri/cm² = 2.0x
            complexityMultiplier = 1 + Math.log10(Math.max(triangleDensity, 10) / 100) * 0.5
            complexityMultiplier = Math.max(1, Math.min(complexityMultiplier, 2.5)) // Clamp 1x to 2.5x

            // Size-based speed bonus: larger models paint faster per unit area
            // (bigger brushes, less relative fine detail)
            // 10cm = 1x, 20cm = 1.3x, 40cm = 1.6x, 80cm = 2x speed
            const modelHeightCm = analysis.dimensions.height / 10
            const sizeSpeedBonus = 1 + Math.log2(Math.max(modelHeightCm, 5) / 10) * 0.5
            const effectiveSpeed = basePaintSpeed * Math.max(sizeSpeedBonus, 1)

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

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Left Panel - Drop Zone & Analysis */}
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                    {/* Drop Zone */}
                    <div
                        className={cn(
                            "relative shrink-0 min-h-[160px] border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-4 cursor-pointer",
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

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-400">Error</p>
                                <p className="text-xs text-stone-400 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* File Info */}
                    {analysis && (
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
                        </div>
                    )}

                    {/* Pricing Calculator */}
                    {analysis && (
                        <div className="bg-stone-900/50 border border-stone-800/60 rounded-lg p-4 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Euro className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                                    Price Estimation
                                </span>
                            </div>

                            {/* Resin Inputs */}
                            <div className="grid grid-cols-3 gap-3">
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
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase text-stone-500">Ship (€)</Label>
                                    <Input
                                        type="number"
                                        value={shippingCost}
                                        onChange={(e) => setShippingCost(e.target.value)}
                                        className="h-8 bg-stone-900 border-stone-800 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Painting Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase text-stone-500">Paint Rate (€/hr)</Label>
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

                            {/* Pre-Supported Toggle */}
                            <div className="flex items-center gap-3 p-2 bg-stone-800/30 rounded">
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
                                        <span className="text-[10px] text-stone-500">% supports</span>
                                    </div>
                                )}
                            </div>

                            <Separator className="bg-stone-800/60" />

                            {/* Analysis Stats */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-stone-800/30 rounded p-2 text-center">
                                    <div className="text-[9px] text-stone-500 uppercase">Surface</div>
                                    <div className="font-bold text-stone-300">{(analysis.surfaceArea / 100).toFixed(1)} cm²</div>
                                </div>
                                <div className="bg-stone-800/30 rounded p-2 text-center">
                                    <div className="text-[9px] text-stone-500 uppercase">Density</div>
                                    <div className="font-bold text-stone-300">{estimates.triangleDensity.toFixed(0)}/cm²</div>
                                </div>
                                <div className="bg-stone-800/30 rounded p-2 text-center">
                                    <div className="text-[9px] text-stone-500 uppercase">Complexity</div>
                                    <div className="font-bold text-amber-400">{estimates.complexityMultiplier.toFixed(1)}x</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* Raw Cost */}
                                <div className="flex justify-between items-center text-xs text-stone-500">
                                    <span>Raw Material:</span>
                                    <span>€{estimates.rawResinCost.toFixed(2)}</span>
                                </div>

                                {/* Unpainted Price */}
                                <div className="bg-stone-900 rounded p-3 border border-stone-800/60">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-3.5 h-3.5 text-stone-400" />
                                        <span className="text-xs font-bold text-stone-300">Unpainted</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-[10px] text-stone-500">
                                            (Mat x {resinMarkup}) + Ship
                                        </div>
                                        <div className="text-xl font-bold text-white">
                                            €{estimates.unpaintedTotal.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Painted Price */}
                                <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/30 rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Paintbrush className="w-3.5 h-3.5 text-violet-400" />
                                            <span className="text-xs font-bold text-violet-300">Painted</span>
                                        </div>
                                        <span className="text-[10px] text-violet-400/70">
                                            ~{estimates.paintingHours.toFixed(1)}h labor
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-[10px] text-violet-400/70">
                                            Unpainted + €{estimates.paintingCost.toFixed(0)} labor + Ship
                                        </div>
                                        <div className="text-xl font-bold text-violet-200">
                                            €{estimates.paintedTotal.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Scale Analysis */}
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                    {analysis ? (
                        <>
                            {/* Best Match Card */}
                            {analysis.bestMatch && (
                                <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/30 rounded-lg p-5 shrink-0">
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

                            {/* All Scales */}
                            <div className="flex-1 bg-stone-900/50 border border-stone-800/60 rounded-lg overflow-hidden min-h-[300px]">
                                <div className="px-4 py-3 border-b border-stone-800/60 flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-stone-400" />
                                    <span className="text-xs font-medium text-stone-300 uppercase tracking-wider">
                                        Scale Reference
                                    </span>
                                </div>
                                <div className="overflow-y-auto h-full custom-scrollbar pb-10">
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

                                            // Calculate painted price using logarithmic complexity
                                            const triangleDensity = analysis.triangleCount * (1 - supportReduction) / (analysis.surfaceArea * (1 - supportReduction) / 100)
                                            let complexityMult = 1 + Math.log10(Math.max(triangleDensity, 10) / 100) * 0.5
                                            complexityMult = Math.max(1, Math.min(complexityMult, 2.5))

                                            // Size-based speed bonus for scaled models
                                            const scaledHeightCm = scaleInfo.heightMm / 10
                                            const sizeSpeedBonus = 1 + Math.log2(Math.max(scaledHeightCm, 5) / 10) * 0.5
                                            const effectiveSpeed = paintSpeed * Math.max(sizeSpeedBonus, 1)

                                            const paintHours = (scaledSurfaceAreaCm2 / effectiveSpeed) * complexityMult
                                            const paintCost = paintHours * hourlyRate
                                            const paintedPrice = unpaintedPrice + paintCost + shipping

                                            return (
                                                <div
                                                    key={scaleInfo.scale}
                                                    className={cn(
                                                        "px-4 py-3 transition-colors",
                                                        isBestMatch
                                                            ? "bg-violet-500/10"
                                                            : "hover:bg-stone-800/30"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-sm font-bold",
                                                                isBestMatch ? "text-violet-300" : "text-stone-300"
                                                            )}>
                                                                {scaleInfo.scale}
                                                            </span>
                                                            {isBestMatch && (
                                                                <Badge className="h-4 px-1.5 text-[9px] bg-violet-500/20 text-violet-300 border-violet-500/40">
                                                                    MATCH
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-right">
                                                            <div>
                                                                <div className="text-[9px] text-stone-500">Unpainted</div>
                                                                <div className="text-sm font-bold text-emerald-400">
                                                                    €{unpaintedPrice.toFixed(0)}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px] text-violet-400">Painted</div>
                                                                <div className="text-sm font-bold text-violet-300">
                                                                    €{paintedPrice.toFixed(0)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Progress
                                                        value={matchPercent}
                                                        className={cn(
                                                            "h-1.5",
                                                            isBestMatch ? "[&>div]:bg-violet-500" : "[&>div]:bg-stone-600"
                                                        )}
                                                    />
                                                    <div className="flex justify-between mt-1.5 text-[10px] text-stone-500">
                                                        <span>
                                                            {scaleInfo.heightCm.toFixed(1)}cm ({diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}mm)
                                                        </span>
                                                        <span>{matchPercent.toFixed(0)}% match</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center bg-stone-900/30 border border-stone-800/60 rounded-lg p-8">
                            <Layers className="w-16 h-16 text-stone-700 mb-4" />
                            <p className="text-sm text-stone-400 mb-2">No STL file loaded</p>
                            <p className="text-xs text-stone-600 max-w-xs">
                                Load an STL file to analyze its dimensions, volume, and estimate printing costs.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
