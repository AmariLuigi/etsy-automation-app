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
        <div className="page-container bg-stone-950">
            {/* Header */}
            <header className="page-header">
                <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-white leading-none">Settings</h2>
                    <p className="text-[10px] text-stone-500 font-medium tracking-wide">API & Provider Configuration</p>
                </div>
            </header>

            {/* Content */}
            <div className="page-content custom-scrollbar">
                <div className="content-wrapper max-w-4xl animate-fade-in-up py-8 flex flex-col gap-12">

                    {/* RunningHub Card */}
                    <Card className="bg-stone-900/50 border-stone-800/60 rounded-none overflow-hidden">
                        <CardHeader className="flex flex-row items-center gap-5 space-y-0 px-8 py-7 border-b border-stone-800/40">
                            <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center">
                                <Bot className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-stone-200">RunningHub AI</CardTitle>
                                <CardDescription className="text-[11px] font-medium text-stone-500 mt-1.5">Core Content Engine</CardDescription>
                            </div>
                            <Badge variant="outline" className="border-primary/40 text-primary text-[9px] font-bold h-6 uppercase rounded-sm px-3 bg-primary/5">Connected</Badge>
                        </CardHeader>
                        <CardContent className="px-6 py-5 flex flex-col gap-4">
                            {/* API Key */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Open API Key
                                </label>
                                <Input
                                    type="password"
                                    placeholder="sk-..."
                                    value={runningHubApiKey}
                                    onChange={(e) => setRunningHubApiKey(e.target.value)}
                                    className="bg-stone-950 border-stone-800 h-11 text-sm rounded-none focus-visible:ring-primary/20"
                                />
                            </div>

                            {/* Workflow IDs Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                        <Workflow className="w-3.5 h-3.5" /> MetaGen ID
                                    </label>
                                    <Input
                                        placeholder="Workflow ID..."
                                        value={runningHubWorkflowId}
                                        onChange={(e) => setRunningHubWorkflowId(e.target.value)}
                                        className="bg-stone-950 border-stone-800 h-10 text-xs rounded-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                        <Workflow className="w-3.5 h-3.5" /> Watermark ID
                                    </label>
                                    <Input
                                        placeholder="Workflow Id..."
                                        value={watermarkWorkflowId}
                                        onChange={(e) => setWatermarkWorkflowId(e.target.value)}
                                        className="bg-stone-950 border-stone-800 h-10 text-xs rounded-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                        <Video className="w-3.5 h-3.5" /> Video ID
                                    </label>
                                    <Input
                                        placeholder="Workflow ID..."
                                        value={videoWorkflowId}
                                        onChange={(e) => setVideoWorkflowId(e.target.value)}
                                        className="bg-stone-950 border-stone-800 h-10 text-xs rounded-none"
                                    />
                                </div>
                            </div>

                            <Separator className="bg-stone-800/50" />

                            {/* Node Config */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                        <Hash className="w-3.5 h-3.5" /> Prompt Node ID
                                    </label>
                                    <Input
                                        placeholder="Default: 5"
                                        value={promptNodeId}
                                        onChange={(e) => setPromptNodeId(e.target.value)}
                                        className="bg-stone-950 border-stone-800 h-10 text-xs rounded-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                        <Type className="w-3.5 h-3.5" /> Prompt Field Name
                                    </label>
                                    <Input
                                        placeholder="Default: text"
                                        value={promptFieldName}
                                        onChange={(e) => setPromptFieldName(e.target.value)}
                                        className="bg-stone-950 border-stone-800 h-10 text-xs rounded-none"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Secondary Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Etsy Card */}
                        <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                            <CardHeader className="px-8 py-6 border-b border-stone-800/40">
                                <div className="flex items-center gap-4">
                                    <ShoppingBag className="w-5 h-5 text-stone-400" />
                                    <div>
                                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-stone-200">Etsy V3</CardTitle>
                                        <CardDescription className="text-[10px] font-medium text-stone-500 mt-1.5">Store Connection</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-8 py-8 space-y-4">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Keystring</label>
                                <Input
                                    placeholder="v3_..."
                                    value={etsyApiKey}
                                    onChange={(e) => setEtsyApiKey(e.target.value)}
                                    className="bg-stone-950 border-stone-800 h-11 text-xs rounded-none"
                                />
                            </CardContent>
                        </Card>

                        {/* Info Card */}
                        <Card className="bg-primary/5 border-primary/20 rounded-none border-l-4 border-l-primary">
                            <CardHeader className="px-8 py-6">
                                <CardTitle className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-3 text-primary">
                                    <Info className="w-5 h-5" /> Workflow Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 pt-0">
                                <p className="text-[13px] text-stone-400 leading-relaxed font-medium">
                                    If you get a Node Info error, check the Node ID of your CLIP Text Encode node in RunningHub and the name of its input field.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Save Button */}
                    <div className="pt-8 pb-6 flex justify-center">
                        <Button
                            onClick={handleSave}
                            size="lg"
                            className={cn(
                                "min-w-[360px] h-14 font-bold uppercase tracking-widest text-sm transition-all rounded-none !px-16",
                                saved ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                            )}
                        >
                            {saved ? (
                                <span className="flex items-center gap-3"><Check className="w-5 h-5" /> Settings Saved</span>
                            ) : (
                                <span className="flex items-center gap-3"><Save className="w-5 h-5" /> Save Settings</span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
