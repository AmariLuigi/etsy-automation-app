import { Suspense, useEffect, useState, useRef } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import * as THREE from "three"
import { BufferGeometry } from "three"
import { X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StlVisualizerProps {
    filePath?: string
    dataUrl?: string | null
    flipped?: boolean
    onFlipChange?: (flipped: boolean) => void
    onClose: () => void
    className?: string
}

// Component to load and display STL mesh
function StlMesh({ blobUrl, flipped }: { blobUrl: string; flipped: boolean }) {
    const geometryRef = useRef<BufferGeometry | null>(null)
    const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
    
    useEffect(() => {
        const loader = new STLLoader()
        loader.load(
            blobUrl,
                (loadedGeometry) => {
                // Center and scale geometry to fit viewport
                loadedGeometry.computeBoundingBox()
                const box = loadedGeometry.boundingBox!
                const center = new THREE.Vector3()
                const size = new THREE.Vector3()
                box.getCenter(center)
                box.getSize(size)
                const maxDim = Math.max(size.x, size.y, size.z)
                const scale = 2 / maxDim // Scale to fit nicely in viewport

                loadedGeometry.translate(-center.x, -center.y, -center.z)
                loadedGeometry.scale(scale, scale, scale)
                
                geometryRef.current = loadedGeometry
                setGeometry(loadedGeometry)
            },
            undefined,
            (error) => {
                console.error('Error loading STL:', error)
            }
        )
        
        return () => {
            if (geometryRef.current) {
                geometryRef.current.dispose()
                geometryRef.current = null
            }
        }
    }, [blobUrl])

    if (!geometry) return null

    return (
        <mesh geometry={geometry} rotation={flipped ? [Math.PI, 0, 0] : [0, 0, 0]}>
            <meshStandardMaterial
                color="#a78bfa"
                metalness={0.3}
                roughness={0.4}
            />
        </mesh>
    )
}

// Fallback component while loading
function LoadingFallback() {
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-stone-400">Loading 3D model...</div>
        </div>
    )
}

export default function StlVisualizer({ filePath, dataUrl: propDataUrl, flipped: propFlipped = false, onFlipChange, onClose, className }: StlVisualizerProps) {
    const [dataUrl, setDataUrl] = useState<string | null>(propDataUrl || null)
    const [isLoading, setIsLoading] = useState(!propDataUrl)
    const [error, setError] = useState<string | null>(null)
    
    const handleFlip = () => {
        const newFlipped = !propFlipped
        onFlipChange?.(newFlipped)
    }

    // Use cached dataUrl if provided, otherwise load from filePath
    useEffect(() => {
        if (propDataUrl) {
            // Use cached data URL
            setDataUrl(propDataUrl)
            setIsLoading(false)
            setError(null)
            return
        }

        if (!filePath) {
            setError("No file path or data URL provided")
            setIsLoading(false)
            return
        }

        let isMounted = true

        async function loadStl() {
            try {
                setIsLoading(true)
                setError(null)
                if (!filePath) {
                    throw new Error("No file path provided")
                }
                const base64 = await window.electronAPI.readStlFile(filePath)
                if (!base64) {
                    throw new Error("Failed to read STL file")
                }
                
                // Convert base64 to ArrayBuffer, then to Blob, then to Object URL
                const binaryString = atob(base64)
                const bytes = new Uint8Array(binaryString.length)
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i)
                }
                const blob = new Blob([bytes], { type: 'application/octet-stream' })
                const url = URL.createObjectURL(blob)
                
                if (isMounted) {
                    setDataUrl(url)
                    setIsLoading(false)
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : "Failed to load STL file")
                    setIsLoading(false)
                }
            }
        }

        loadStl()

        return () => {
            isMounted = false
            // Only revoke if we created the URL (not if it was passed as prop)
            if (dataUrl && !propDataUrl) {
                URL.revokeObjectURL(dataUrl)
            }
        }
    }, [filePath, propDataUrl])

    return (
        <div className={cn("relative bg-stone-900/50 border border-stone-800/60 rounded-lg overflow-hidden", className)}>
            {/* Close Button */}
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="absolute top-2 right-2 z-10 h-8 w-8 bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/50"
                aria-label="Close visualizer and unload model"
            >
                <X className="h-4 w-4 text-stone-300" />
            </Button>

            {/* Flip Button */}
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleFlip}
                className="absolute top-2 right-12 z-10 h-8 w-8 bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/50"
                aria-label="Flip model vertically"
                title="Flip model vertically"
            >
                <RotateCcw className="h-4 w-4 text-stone-300" />
            </Button>

            {/* Canvas Container */}
            <div className="w-full" style={{ height: "400px", minHeight: "400px" }}>
                {isLoading && <LoadingFallback />}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm text-red-400">{error}</div>
                    </div>
                )}
                {dataUrl && !error && (
                    <Canvas
                        camera={{ position: [2, 2, 2], fov: 50 }}
                        gl={{ antialias: true, alpha: false }}
                    >
                        <Suspense fallback={null}>
                            {/* Lighting */}
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[10, 10, 5]} intensity={1} />
                            <directionalLight position={[-10, -10, -5]} intensity={0.3} />

                            {/* STL Mesh */}
                            <StlMesh blobUrl={dataUrl} flipped={propFlipped} />

                            {/* Controls */}
                            <OrbitControls
                                enablePan={true}
                                enableZoom={true}
                                enableRotate={true}
                                minDistance={0.5}
                                maxDistance={5}
                            />
                        </Suspense>
                    </Canvas>
                )}
            </div>
        </div>
    )
}
