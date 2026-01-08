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
        <aside className="w-60 bg-stone-950 border-r border-stone-800/60 flex flex-col h-full shrink-0 z-50">
            {/* Brand Header */}
            <div className="drag-region h-[4.5rem] flex items-center !pl-8 !pr-4 shrink-0 border-b border-stone-800/60">
                <div className="no-drag flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary flex items-center justify-center shrink-0">
                        <Rocket className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-[11px] font-black tracking-widest uppercase leading-none gradient-text">
                            ShopFlow Pro
                        </h1>
                        <p className="text-[9px] text-stone-500 uppercase font-medium tracking-wider leading-none">
                            Etsy Automation
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col min-h-0 py-6">
                <p className="text-[9px] font-bold text-stone-600 uppercase tracking-widest px-6 mb-3">
                    Navigation
                </p>

                <div className="space-y-1 px-4">
                    <Button
                        variant={activeTab === "workspace" ? "default" : "ghost"}
                        className={cn(
                            "w-full justify-start gap-4 h-11 !pl-8 !pr-4 rounded-none transition-all group overflow-hidden relative",
                            activeTab === "workspace" 
                                ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" 
                                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"
                        )}
                        onClick={() => onTabChange("workspace")}
                    >
                        {activeTab === "workspace" && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                        )}
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] uppercase font-bold tracking-wide">Workspace</span>
                    </Button>

                    <Button
                        variant={activeTab === "settings" ? "default" : "ghost"}
                        className={cn(
                            "w-full justify-start gap-4 h-11 !pl-8 !pr-4 rounded-none transition-all group overflow-hidden relative",
                            activeTab === "settings" 
                                ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" 
                                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"
                        )}
                        onClick={() => onTabChange("settings")}
                    >
                        {activeTab === "settings" && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                        )}
                        <Settings className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] uppercase font-bold tracking-wide">Settings</span>
                    </Button>
                </div>
            </nav>

            {/* Account Status Panel */}
            <div className="px-4 pb-4 shrink-0">
                <div className="bg-stone-900/60 border border-stone-800/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Account</span>
                        <Badge variant="outline" className={cn(
                            "h-5 px-2 text-[9px] font-bold uppercase rounded-sm",
                            accountData ? "border-primary/40 text-primary bg-primary/5" : "border-stone-700 text-stone-500"
                        )}>
                            {accountData ? "Synced" : "Offline"}
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-stone-500">
                                <Coins className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium">Coins</span>
                            </div>
                            <span className="text-[11px] font-bold text-primary tabular-nums">
                                {accountData ? formatNumber(accountData.remainCoins) : "---"}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-stone-500">
                                <Activity className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium">Tasks</span>
                            </div>
                            <span className="text-[11px] font-bold text-stone-300 tabular-nums">
                                {accountData ? accountData.currentTasks : "0"}
                            </span>
                        </div>
                    </div>

                    <Separator className="bg-stone-800/60" />

                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium text-stone-500">Balance</span>
                        <span className="text-[11px] font-bold text-stone-300 tabular-nums">
                            {accountData ? `${accountData.currency === "CNY" ? "¥" : "$"}${formatNumber(accountData.remainMoney)}` : "---"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 h-12 border-t border-stone-800/60 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-stone-600 font-medium tracking-wide">v1.2</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-stone-500 hover:text-primary hover:bg-transparent"
                    onClick={fetchAccountStatus}
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
            </div>
        </aside>
    )
}
