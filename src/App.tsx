import { useState } from "react"
import "./index.css"
import Sidebar from "./components/layout/Sidebar"
import ProductWorkspace from "./components/pages/ProductWorkspace"
import SettingsPage from "./components/pages/SettingsPage"

export type TabType = "workspace" | "settings"

function App() {
    const [activeTab, setActiveTab] = useState<TabType>("workspace")

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-stone-950">
            {/* Sidebar - Fixed Width, Non-Shrinking */}
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden flex flex-col min-w-0">
                <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
                    {activeTab === "workspace" && <ProductWorkspace />}
                    {activeTab === "settings" && <SettingsPage />}
                </div>
            </main>
        </div>
    )
}

export default App
