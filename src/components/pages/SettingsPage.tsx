import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Bot,
    ShoppingBag,
    Save,
    Check,
    ShieldCheck,
    Info,
    Workflow,
    Hash,
    Type,
    Video
} from "lucide-react"

export default function SettingsPage() {
    const [runningHubApiKey, setRunningHubApiKey] = useState("")
    const [runningHubWorkflowId, setRunningHubWorkflowId] = useState("")
    const [promptNodeId, setPromptNodeId] = useState("")
    const [promptFieldName, setPromptFieldName] = useState("")
    const [watermarkWorkflowId, setWatermarkWorkflowId] = useState("")
    const [videoWorkflowId, setVideoWorkflowId] = useState("")
    const [etsyApiKey, setEtsyApiKey] = useState("")
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setRunningHubApiKey(localStorage.getItem("runningHubApiKey") || "")
        setRunningHubWorkflowId(localStorage.getItem("runningHubWorkflowId") || "")
        setPromptNodeId(localStorage.getItem("promptNodeId") || "5")
        setPromptFieldName(localStorage.getItem("promptFieldName") || "text")
        setWatermarkWorkflowId(localStorage.getItem("watermarkWorkflowId") || "2008860019835543553")
        setVideoWorkflowId(localStorage.getItem("videoWorkflowId") || "2008910022977261570")
        setEtsyApiKey(localStorage.getItem("etsyApiKey") || "")
    }, [])

    const handleSave = () => {
        localStorage.setItem("runningHubApiKey", runningHubApiKey)
        localStorage.setItem("runningHubWorkflowId", runningHubWorkflowId)
        localStorage.setItem("promptNodeId", promptNodeId)
        localStorage.setItem("promptFieldName", promptFieldName)
        localStorage.setItem("watermarkWorkflowId", watermarkWorkflowId)
        localStorage.setItem("videoWorkflowId", videoWorkflowId)
        localStorage.setItem("etsyApiKey", etsyApiKey)

        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-stone-950">
            {/* Header Area */}
            <div className="h-20 border-b border-stone-800 bg-stone-950/80 backdrop-blur-md shrink-0">
                <div className="h-full px-12 xl:px-24 flex flex-col justify-center">
                    <h2 className="text-sm font-black tracking-[0.2em] uppercase text-white leading-none">Settings</h2>
                    <p className="text-[10px] text-stone-500 uppercase font-black tracking-[0.2em] mt-1.5">API & Provider Configuration</p>
                </div>
            </div>

            {/* Centered Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center">
                <div className="w-full max-w-5xl px-12 xl:px-24 py-12 space-y-12 animate-fade-in-up flex-shrink-0">

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                        {/* RunningHub Settings */}
                        <Card className="bg-stone-900/40 border-stone-800 xl:col-span-2 rounded-none">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-6">
                                <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-stone-200">RunningHub AI</CardTitle>
                                    <CardDescription className="text-[10px] uppercase font-bold text-stone-500">Core Content Engine</CardDescription>
                                </div>
                                <Badge variant="outline" className="border-primary/50 text-primary text-[9px] font-black h-5 uppercase rounded-none px-2 bg-primary/5">Connected</Badge>
                            </CardHeader>
                            <Separator className="bg-stone-800" />
                            <CardContent className="p-8 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5" /> Open API Key
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="sk-..."
                                        value={runningHubApiKey}
                                        onChange={(e) => setRunningHubApiKey(e.target.value)}
                                        className="bg-stone-950 border-stone-800 h-12 text-sm rounded-none focus-visible:ring-primary/20"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest flex items-center gap-2">
                                            <Workflow className="w-3.5 h-3.5" /> MetaGen Workflow ID
                                        </label>
                                        <Input
                                            placeholder="Workflow ID..."
                                            value={runningHubWorkflowId}
                                            onChange={(e) => setRunningHubWorkflowId(e.target.value)}
                                            className="bg-stone-950 border-stone-800 h-11 text-[11px] rounded-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest flex items-center gap-2">
                                            <Workflow className="w-3.5 h-3.5" /> Watermark Workflow ID
                                        </label>
                                        <Input
                                            placeholder="Workflow Id..."
                                            value={watermarkWorkflowId}
                                            onChange={(e) => setWatermarkWorkflowId(e.target.value)}
                                            className="bg-stone-950 border-stone-800 h-11 text-[11px] rounded-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest flex items-center gap-2">
                                            <Video className="w-3.5 h-3.5" /> Video Workflow ID
                                        </label>
                                        <Input
                                            placeholder="Workflow ID..."
                                            value={videoWorkflowId}
                                            onChange={(e) => setVideoWorkflowId(e.target.value)}
                                            className="bg-stone-950 border-stone-800 h-11 text-[11px] rounded-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-stone-800/50">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                            <Hash className="w-3.5 h-3.5" /> Prompt Node ID
                                        </label>
                                        <Input
                                            placeholder="Default: 5"
                                            value={promptNodeId}
                                            onChange={(e) => setPromptNodeId(e.target.value)}
                                            className="bg-stone-950 border-stone-800 h-11 text-[11px] rounded-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                            <Type className="w-3.5 h-3.5" /> Prompt Field Name
                                        </label>
                                        <Input
                                            placeholder="Default: text"
                                            value={promptFieldName}
                                            onChange={(e) => setPromptFieldName(e.target.value)}
                                            className="bg-stone-950 border-stone-800 h-11 text-[11px] rounded-none"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Side Actions/Info */}
                        <div className="space-y-10 flex flex-col justify-between h-full">
                            <Card className="bg-stone-900/40 border-stone-800 rounded-none">
                                <CardHeader className="p-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <ShoppingBag className="w-4 h-4 text-stone-400" />
                                        <CardTitle className="text-xs font-black uppercase tracking-widest text-stone-200">Etsy V3</CardTitle>
                                    </div>
                                    <CardDescription className="text-[10px] uppercase font-bold text-stone-500">Store Connection</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 pt-0 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-stone-600 uppercase tracking-widest leading-none">Keystring</label>
                                        <Input
                                            placeholder="v3_..."
                                            value={etsyApiKey}
                                            onChange={(e) => setEtsyApiKey(e.target.value)}
                                            className="bg-stone-950 border-stone-800 h-11 text-[11px] rounded-none"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-primary/5 border-primary/20 rounded-none border-l-2">
                                <CardHeader className="p-6">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                                        <Info className="w-4 h-4" /> Workflow Info
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 pt-0">
                                    <p className="text-[11px] text-stone-500 leading-relaxed font-bold uppercase tracking-tight">
                                        If you get a Node Info error, please check the Node ID of your CLIP Text Encode node in RunningHub and the name of its input field.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Actions Area - Centered Button */}
                    <div className="pt-12 flex justify-center">
                        <Button
                            onClick={handleSave}
                            size="lg"
                            className={cn(
                                "min-w-[320px] h-16 font-black uppercase tracking-[0.3em] text-xs transition-all rounded-none",
                                saved ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary-hover shadow-xl shadow-primary/10"
                            )}
                        >
                            {saved ? (
                                <span className="flex items-center gap-3"><Check className="w-5 h-5" /> Settings Saved</span>
                            ) : (
                                <span className="flex items-center gap-3"><Save className="w-5 h-5" /> Commit Settings</span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
