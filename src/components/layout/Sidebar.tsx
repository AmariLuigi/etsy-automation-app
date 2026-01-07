import { useState, useEffect } from "react"
import { type TabType } from "../../App"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    LayoutDashboard,
    Settings,
    Coins,
    Activity,
    RefreshCw,
    Rocket
} from "lucide-react"

interface SidebarProps {
    activeTab: TabType
    onTabChange: (tab: TabType) => void
}

interface AccountData {
    remainCoins: string
    currentTasks: string
    remainMoney: string
    currency: string
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const [accountData, setAccountData] = useState<AccountData | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        fetchAccountStatus()
        const interval = setInterval(fetchAccountStatus, 60000)
        return () => clearInterval(interval)
    }, [])

    const fetchAccountStatus = async () => {
        const apiKey = localStorage.getItem("runningHubApiKey")
        if (!apiKey) return

        setIsLoading(true)
        try {
            const result = await window.electronAPI.getAccountStatus({ apiKey })
            if (result.success && result.data) {
                setAccountData(result.data)
            }
        } catch (error) {
            console.error("Failed to fetch account status:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const formatNumber = (num: string) => {
        const n = parseFloat(num)
        if (isNaN(n)) return "---"
        if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
        if (n >= 1000) return (n / 1000).toFixed(1) + "K"
        return n.toString()
    }

    return (
        <aside className="w-64 bg-stone-950 border-r border-stone-800 flex flex-col h-full shrink-0 z-50">
            {/* Header Wrapper */}
            <div className="px-6">
                <div className="drag-region h-20 flex items-center shrink-0 border-b border-stone-800 bg-stone-950">
                    <div className="no-drag flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary flex items-center justify-center shrink-0">
                            <Rocket className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xs font-black tracking-widest uppercase leading-none gradient-text">
                                Etsy Pro
                            </h1>
                            <p className="text-[9px] text-stone-500 uppercase font-bold tracking-[0.2em] leading-none mt-1.5">
                                Automation
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Wrapper with Padding */}
            <div className="flex-1 flex flex-col min-h-0 pt-4">
                <p className="text-[9px] font-black text-stone-600 uppercase tracking-[0.2em] px-10 mb-4">
                    Menu
                </p>

                <div className="space-y-1">
                    <div className="px-4"> {/* Navigation Padding Wrapper */}
                        <Button
                            variant={activeTab === "workspace" ? "default" : "ghost"}
                            className={cn(
                                "w-full justify-start gap-4 h-11 px-6 rounded-none transition-all group overflow-hidden relative",
                                activeTab === "workspace" ? "font-bold bg-primary/10 text-primary hover:bg-primary/20" : "text-stone-400 hover:text-stone-200"
                            )}
                            onClick={() => onTabChange("workspace")}
                        >
                            {activeTab === "workspace" && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                            )}
                            <LayoutDashboard className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                            <span className="text-[10px] uppercase font-black tracking-[0.15em]">Workspace</span>
                        </Button>
                    </div>

                    <div className="px-4"> {/* Navigation Padding Wrapper */}
                        <Button
                            variant={activeTab === "settings" ? "default" : "ghost"}
                            className={cn(
                                "w-full justify-start gap-4 h-11 px-6 rounded-none transition-all group overflow-hidden relative",
                                activeTab === "settings" ? "font-bold bg-primary/10 text-primary hover:bg-primary/20" : "text-stone-400 hover:text-stone-200"
                            )}
                            onClick={() => onTabChange("settings")}
                        >
                            {activeTab === "settings" && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                            )}
                            <Settings className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-45" />
                            <span className="text-[10px] uppercase font-black tracking-[0.15em]">Settings</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Account Info Wrapper */}
            <div className="p-6 shrink-0 pt-0">
                <div className="bg-stone-900 border border-stone-800 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-stone-600 uppercase tracking-widest leading-none">Status</span>
                        <Badge variant="outline" className={cn(
                            "h-4 px-1.5 text-[8px] font-black uppercase rounded-none leading-none",
                            accountData ? "border-primary/40 text-primary bg-primary/5" : "border-stone-700 text-stone-600"
                        )}>
                            {accountData ? "Synced" : "Offline"}
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-stone-500">
                            <div className="flex items-center gap-3">
                                <Coins className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Coins</span>
                            </div>
                            <span className="text-[11px] font-black text-primary">
                                {accountData ? formatNumber(accountData.remainCoins) : "---"}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-stone-500">
                            <div className="flex items-center gap-3">
                                <Activity className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Tasks</span>
                            </div>
                            <span className="text-[11px] font-black text-stone-200">
                                {accountData ? accountData.currentTasks : "0"}
                            </span>
                        </div>
                    </div>

                    <Separator className="bg-stone-800" />

                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest">Wallet</span>
                        <span className="text-[11px] font-black text-stone-400">
                            {accountData ? `${accountData.currency === "CNY" ? "¥" : "$"}${formatNumber(accountData.remainMoney)}` : "---"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer Wrapper */}
            <div className="px-10 h-16 border-t border-stone-800 flex items-center justify-between shrink-0 bg-stone-950">
                <span className="text-[9px] text-stone-700 font-black uppercase tracking-[0.25em]">v1.2</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-stone-600 hover:text-primary hover:bg-transparent"
                    onClick={fetchAccountStatus}
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
            </div>
        </aside>
    )
}
