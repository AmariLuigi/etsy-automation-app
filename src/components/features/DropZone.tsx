import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, FolderOpen, Loader2, Activity, Sparkles } from "lucide-react"

interface DropZoneProps {
    onFolderSelect: (path: string) => void
    isDragging: boolean
    onDragStateChange: (state: boolean) => void
}

export default function DropZone({ onFolderSelect, isDragging, onDragStateChange }: DropZoneProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleSelectFolder = async () => {
        setIsLoading(true)
        try {
            const path = await window.electronAPI.openFolderDialog()
            if (path) {
                onFolderSelect(path)
            }
        } catch (error) {
            console.error("Failed to open folder dialog:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onDragStateChange(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onDragStateChange(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onDragStateChange(false)

        const files = e.dataTransfer.files
        if (files.length > 0) {
            // Electron doesn't give directory path easily through file drop in some cases,
            // but let's assume we handle it or use the button for primary selection.
            // For now, we prefer the dialog for reliability in Electron.
            handleSelectFolder()
        }
    }

    return (
        <div className="w-full max-w-xl mx-auto px-4">
            <Card
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative group transition-all duration-200 border-2 border-dashed flex flex-col items-center justify-center bg-stone-900/30 py-16 px-8",
                    isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-stone-800 hover:border-stone-700"
                )}
            >
                <div className="relative z-10 flex flex-col items-center text-center px-4">
                    <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-3">
                        {isDragging ? "Drop Folder" : "Initialize Workspace"}
                    </h2>
                    <p className="text-[11px] text-stone-500 font-medium tracking-wide mb-8 max-w-xs leading-relaxed">
                        Select the root folder containing your product assets
                    </p>

                    <Button
                        onClick={handleSelectFolder}
                        disabled={isLoading}
                        size="lg"
                        className="font-bold uppercase tracking-widest text-xs !px-16"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : isDragging ? (
                            <Upload className="w-5 h-5 mr-2" />
                        ) : (
                            <FolderOpen className="w-5 h-5 mr-2" />
                        )}
                        {isLoading ? "Analyzing..." : "Browse Files"}
                    </Button>
                </div>

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-stone-800 group-hover:border-primary/40 transition-colors" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-stone-800 group-hover:border-primary/40 transition-colors" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-stone-800 group-hover:border-primary/40 transition-colors" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-stone-800 group-hover:border-primary/40 transition-colors" />
            </Card>

            {/* Feature Pills */}
            <div className="mt-8 flex justify-center gap-4">
                {[
                    { icon: <Upload className="w-3.5 h-3.5" />, label: "Upload" },
                    { icon: <Activity className="w-3.5 h-3.5" />, label: "Scan" },
                    { icon: <Sparkles className="w-3.5 h-3.5" />, label: "AI Enrich" },
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-4 py-2.5 bg-stone-900/40 border border-stone-800/50 text-stone-500">
                        {item.icon}
                        <span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
