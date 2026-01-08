import { useState, useCallback } from "react"
import type { FolderAnalysis } from "../../types/electron"
import DropZone from "../features/DropZone"
import ProductEditor from "../features/ProductEditor"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function ProductWorkspace() {
    const [folderData, setFolderData] = useState<FolderAnalysis | null>(null)
    const [isDragging, setIsDragging] = useState(false)
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
                setGeneratedContent({
                    title: `${analysis.folderName} - ${analysis.parentFolder} - STL ${analysis.totalFiles}+ Files for 3D Print`,
                    description: generatePlaceholderDescription(analysis),
                    tags: [
                        `${analysis.folderName.toLowerCase()} stl`,
                        `${analysis.parentFolder.toLowerCase()} stl`,
                        `${analysis.folderName.toLowerCase()} 3d print`,
                        `${analysis.folderName.toLowerCase()} figure`,
                        "stl files",
                        "3d print",
                        "resin print",
                        "3d print file",
                        "tabletop",
                        "miniature"
                    ],
                })
            }
        } catch (error) {
            console.error("Error analyzing folder:", error)
        }
    }, [])

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
                        <div className="w-full max-w-xl animate-fade-in-up">
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
                        />
                    </div>
                )}
            </main>
        </div>
    )
}

function generatePlaceholderDescription(analysis: FolderAnalysis): string {
    const sizeGB = (analysis.totalSize / (1024 * 1024 * 1024)).toFixed(2)
    const stlCount = analysis.fileTypes["stl"] || 0
    const lysCount = analysis.fileTypes["lys"] || 0

    return `${analysis.folderName.toUpperCase()} - ${analysis.parentFolder.toUpperCase()} - 3D PRINT PACK

🎨 HIGH QUALITY FILES PACK - ${analysis.totalFiles}+ FILES | ${sizeGB} GB 🎨

Bring ${analysis.folderName} to life with this stunning 3D print file pack! Ready to print and display.

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
After purchase, you'll receive a download link.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ PLEASE NOTE:
This is a DIGITAL product - no physical items will be shipped
For personal use only
Basic 3D printing knowledge recommended

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Message me anytime - I'm happy to help!`
}
