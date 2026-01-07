import { useState, useCallback } from "react"
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
        <div className="w-full max-w-2xl mx-auto py-12">
            <Card
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative group transition-all duration-300 border-2 border-dashed h-[300px] flex flex-col items-center justify-center bg-stone-900/40",
                    isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-stone-800 hover:border-stone-700"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col items-center text-center px-6">
                    <div className={cn(
                        "w-16 h-16 mb-6 flex items-center justify-center bg-stone-900 border border-stone-800 transition-all duration-300",
                        isDragging ? "border-primary text-primary scale-110" : "text-stone-500 group-hover:text-stone-300"
                    )}>
                        {isLoading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : isDragging ? (
                            <Upload className="w-6 h-6 animate-bounce" />
                        ) : (
                            <FolderOpen className="w-6 h-6" />
                        )}
                    </div>

                    <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
                        {isDragging ? "Drop Product Folder" : "Initialize Workspace"}
                    </h2>
                    <p className="text-sm text-stone-500 uppercase tracking-tight font-bold mb-8">
                        Select the root folder containing your product assets
                    </p>

                    <Button
                        onClick={handleSelectFolder}
                        disabled={isLoading}
                        size="lg"
                        className="font-bold uppercase tracking-widest px-8 h-12"
                    >
                        {isLoading ? "Analyzing..." : "Browse Local Files"}
                    </Button>
                </div>

                {/* Corner Accents - Pure Stone Aesthetics */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-stone-800 group-hover:border-primary/50 transition-colors" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-stone-800 group-hover:border-primary/50 transition-colors" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-stone-800 group-hover:border-primary/50 transition-colors" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-stone-800 group-hover:border-primary/50 transition-colors" />
            </Card>

            <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                    { icon: <Upload className="w-4 h-4" />, title: "Upload", desc: "Drag your folder" },
                    { icon: <Activity className="w-4 h-4" />, title: "Scan", desc: "Auto-file detection" },
                    { icon: <Sparkles className="w-4 h-4" />, title: "Enrich", desc: "AI metadata gen" },
                ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center p-4 bg-stone-900/20 border border-stone-800/50">
                        <div className="text-stone-600 mb-2">{item.icon}</div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{item.title}</p>
                        <p className="text-[9px] text-stone-600 uppercase mt-1">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
