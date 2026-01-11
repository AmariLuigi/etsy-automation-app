import { useState, useCallback } from "react"
import type { FolderAnalysis } from "../../types/electron"
import DropZone from "../features/DropZone"
import ProductEditor from "../features/ProductEditor"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package, FileDown } from "lucide-react"

export type ProductType = 'physical' | 'digital'

export default function ProductWorkspace() {
    const [folderData, setFolderData] = useState<FolderAnalysis | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [productType, setProductType] = useState<ProductType>('digital')
    const [generatedContent, setGeneratedContent] = useState<{
        title: string
        description: string
        tags: string[]
    } | null>(null)

    const handleFolderSelect = useCallback(async (path: string) => {
        try {
            const analysis = await window.electronAPI.analyzeFolder(path)
            if (analysis) {
                setFolderData(analysis)

                // Extract clean product name (remove numeric prefixes like "1 - ")
                const cleanName = analysis.folderName.replace(/^\d+\s*[-–]\s*/, '').trim()

                // Generate different title based on product type
                const title = productType === 'digital'
                    ? `${cleanName} - ${analysis.parentFolder} - STL ${analysis.totalFiles}+ Files for 3D Print`
                    : `${cleanName} - ${analysis.parentFolder} - 3D Printed Figure | Resin Model`

                // Generate different tags based on product type
                const tags = productType === 'digital'
                    ? [
                        `${cleanName.toLowerCase()} stl`,
                        `${analysis.parentFolder.toLowerCase()} stl`,
                        `${cleanName.toLowerCase()} 3d print files`,
                        `${cleanName.toLowerCase()} digital download`,
                        "stl files",
                        "3d print file",
                        "resin print stl",
                        "digital stl file",
                        "instant download",
                        "3d model file"
                    ]
                    : [
                        `${cleanName.toLowerCase()} figure`,
                        `${analysis.parentFolder.toLowerCase()} figure`,
                        `${cleanName.toLowerCase()} statue`,
                        `${cleanName.toLowerCase()} 3d print`,
                        "3d printed figure",
                        "resin figure",
                        "anime figure",
                        "collectible statue",
                        "handmade figure",
                        "custom figure"
                    ]

                setGeneratedContent({
                    title,
                    description: generatePlaceholderDescription(analysis, productType, cleanName),
                    tags,
                })
            }
        } catch (error) {
            console.error("Error analyzing folder:", error)
        }
    }, [productType])

    const handleReset = () => {
        setFolderData(null)
        setGeneratedContent(null)
    }

    return (
        <div className="page-container bg-stone-950">
            {/* Header */}
            <header className="page-header sticky top-0 z-20">
                <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white leading-none">Workspace</h2>
                        <p className="text-[10px] text-stone-500 font-medium tracking-wide flex items-center gap-2">
                            {folderData ? (
                                <>
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                    Editing: <span className="text-stone-300">{folderData.folderName}</span>
                                    <span className={`ml-2 px-2 py-0.5 text-[8px] font-bold uppercase rounded ${productType === 'digital' ? 'bg-green-600/30 text-green-400' : 'bg-primary/30 text-primary'}`}>
                                        {productType}
                                    </span>
                                </>
                            ) : (
                                "Ready for initialization"
                            )}
                        </p>
                    </div>
                    {folderData && (
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="text-[10px] font-bold uppercase tracking-wider text-stone-400 hover:text-primary h-9 rounded-none border-stone-800 hover:border-primary/30 !px-6"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                            New Listing
                        </Button>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="page-content custom-scrollbar">
                {!folderData ? (
                    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
                        <div className="w-full max-w-xl animate-fade-in-up space-y-6">
                            {/* Product Type Selection */}
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setProductType('physical')}
                                    className={`flex items-center gap-2 px-8 py-3 font-bold uppercase tracking-wider text-xs transition-all border ${productType === 'physical'
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-stone-900/50 text-stone-400 border-stone-800 hover:text-stone-200 hover:border-stone-600'
                                        }`}
                                >
                                    <Package className="w-5 h-5" />
                                    Physical Product
                                </button>
                                <button
                                    onClick={() => setProductType('digital')}
                                    className={`flex items-center gap-2 px-8 py-3 font-bold uppercase tracking-wider text-xs transition-all border ${productType === 'digital'
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-stone-900/50 text-stone-400 border-stone-800 hover:text-stone-200 hover:border-stone-600'
                                        }`}
                                >
                                    <FileDown className="w-5 h-5" />
                                    Digital Product
                                </button>
                            </div>

                            <DropZone
                                onFolderSelect={handleFolderSelect}
                                isDragging={isDragging}
                                onDragStateChange={setIsDragging}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="content-wrapper animate-fade-in">
                        <ProductEditor
                            folderData={folderData}
                            generatedContent={generatedContent}
                            onContentChange={setGeneratedContent}
                            productType={productType}
                        />
                    </div>
                )}
            </main>
        </div>
    )
}

function generatePlaceholderDescription(analysis: FolderAnalysis, productType: ProductType, cleanName: string): string {
    const sizeGB = (analysis.totalSize / (1024 * 1024 * 1024)).toFixed(2)
    const stlCount = analysis.fileTypes["stl"] || 0
    const lysCount = analysis.fileTypes["lys"] || 0

    if (productType === 'physical') {
        return `${cleanName.toUpperCase()} - ${analysis.parentFolder.toUpperCase()} - 3D PRINTED FIGURE

🎨 STUNNING 3D PRINTED ${cleanName.toUpperCase()} FIGURE 🎨

Add ${cleanName} to your collection! This beautiful 3D printed figure is professionally crafted with incredible detail.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 WHAT YOU'LL RECEIVE:
★ High-quality resin 3D printed ${cleanName} figure
★ Printed, cleaned, and cured - ready to paint or display
★ Select your preferred size from the dropdown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖨️ QUALITY GUARANTEED:
✅ Printed using premium 8K resin
✅ Professionally cleaned and UV cured
✅ Carefully inspected before shipping
✅ Secured packaging for safe delivery

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 PAINTING SERVICES:
Want it painted? Check our painting add-on options!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ PROCESSING & SHIPPING:
• Processing time: 10 business days (handmade to order)
• Shipping: 3-5 business days worldwide with tracking
• Carefully packaged to prevent damage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ PLEASE NOTE:
• This is a PHYSICAL product - will be shipped to you
• Unpainted unless painting option selected
• Select size from dropdown before ordering
• Minor imperfections may occur with 3D printing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Message me anytime - I'm happy to help!`
    }

    return `${cleanName.toUpperCase()} - ${analysis.parentFolder.toUpperCase()} - 3D PRINT FILES

🎨 PREMIUM ${cleanName.toUpperCase()} STL PACK - ${analysis.totalFiles}+ FILES | ${sizeGB} GB 🎨

Print your own ${cleanName}! This comprehensive STL pack includes everything you need.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 WHAT'S INCLUDED:
★ ${analysis.totalFiles} high-quality files ready to print
★ ${stlCount} STL files for direct printing
${lysCount > 0 ? `★ ${lysCount} Lychee slicer files (pre-supported)` : ""}
★ ${sizeGB} GB of content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖨️ PRINT READY:
✅ Works with any FDM or resin 3D printer
${lysCount > 0 ? "✅ Pre-supported files included for resin printing" : ""}
✅ Split into printable parts
✅ High detail models - perfect for painting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 INSTANT DIGITAL DOWNLOAD
After purchase, you'll receive a download link immediately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ PLEASE NOTE:
• This is a DIGITAL product - no physical items shipped
• For personal use only
• Basic 3D printing knowledge recommended

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Message me anytime - I'm happy to help!`
}
