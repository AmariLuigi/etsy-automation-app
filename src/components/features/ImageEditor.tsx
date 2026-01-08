import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
    Type,
    Image as ImageIcon,
    Download,
    Trash2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Bold,
    Italic,
    ChevronUp,
    ChevronDown,
    Copy,
    Lock,
    Unlock,
    Grid,
    Square
} from "lucide-react"

interface CollageSlot {
    id: string
    x: number // relative to collage element (0-1)
    y: number
    width: number // relative (0-1)
    height: number
    imageId?: string // linked image element id
    imageSrc?: string
    imageX: number // image position within slot
    imageY: number
    imageWidth: number
    imageHeight: number
    originalWidth?: number
    originalHeight?: number
}

interface CollageTemplate {
    id: string
    name: string
    slots: Omit<CollageSlot, 'id' | 'imageId' | 'imageSrc' | 'imageX' | 'imageY' | 'imageWidth' | 'imageHeight' | 'originalWidth' | 'originalHeight'>[]
}

const COLLAGE_TEMPLATES: CollageTemplate[] = [
    {
        id: 'grid-2x2',
        name: '2x2 Grid',
        slots: [
            { x: 0, y: 0, width: 0.5, height: 0.5 },
            { x: 0.5, y: 0, width: 0.5, height: 0.5 },
            { x: 0, y: 0.5, width: 0.5, height: 0.5 },
            { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
        ]
    },
    {
        id: 'grid-3x3',
        name: '3x3 Grid',
        slots: [
            { x: 0, y: 0, width: 0.333, height: 0.333 },
            { x: 0.333, y: 0, width: 0.334, height: 0.333 },
            { x: 0.667, y: 0, width: 0.333, height: 0.333 },
            { x: 0, y: 0.333, width: 0.333, height: 0.334 },
            { x: 0.333, y: 0.333, width: 0.334, height: 0.334 },
            { x: 0.667, y: 0.333, width: 0.333, height: 0.334 },
            { x: 0, y: 0.667, width: 0.333, height: 0.333 },
            { x: 0.333, y: 0.667, width: 0.334, height: 0.333 },
            { x: 0.667, y: 0.667, width: 0.333, height: 0.333 },
        ]
    },
    {
        id: 'grid-2x3',
        name: '2x3 Grid',
        slots: [
            { x: 0, y: 0, width: 0.5, height: 0.333 },
            { x: 0.5, y: 0, width: 0.5, height: 0.333 },
            { x: 0, y: 0.333, width: 0.5, height: 0.334 },
            { x: 0.5, y: 0.333, width: 0.5, height: 0.334 },
            { x: 0, y: 0.667, width: 0.5, height: 0.333 },
            { x: 0.5, y: 0.667, width: 0.5, height: 0.333 },
        ]
    },
    {
        id: 'grid-4x4',
        name: '4x4 Grid',
        slots: [
            { x: 0, y: 0, width: 0.25, height: 0.25 },
            { x: 0.25, y: 0, width: 0.25, height: 0.25 },
            { x: 0.5, y: 0, width: 0.25, height: 0.25 },
            { x: 0.75, y: 0, width: 0.25, height: 0.25 },
            { x: 0, y: 0.25, width: 0.25, height: 0.25 },
            { x: 0.25, y: 0.25, width: 0.25, height: 0.25 },
            { x: 0.5, y: 0.25, width: 0.25, height: 0.25 },
            { x: 0.75, y: 0.25, width: 0.25, height: 0.25 },
            { x: 0, y: 0.5, width: 0.25, height: 0.25 },
            { x: 0.25, y: 0.5, width: 0.25, height: 0.25 },
            { x: 0.5, y: 0.5, width: 0.25, height: 0.25 },
            { x: 0.75, y: 0.5, width: 0.25, height: 0.25 },
            { x: 0, y: 0.75, width: 0.25, height: 0.25 },
            { x: 0.25, y: 0.75, width: 0.25, height: 0.25 },
            { x: 0.5, y: 0.75, width: 0.25, height: 0.25 },
            { x: 0.75, y: 0.75, width: 0.25, height: 0.25 },
        ]
    },
    {
        id: 'horizontal-2',
        name: '2 Horizontal',
        slots: [
            { x: 0, y: 0, width: 0.5, height: 1 },
            { x: 0.5, y: 0, width: 0.5, height: 1 },
        ]
    },
    {
        id: 'horizontal-3',
        name: '3 Horizontal',
        slots: [
            { x: 0, y: 0, width: 0.333, height: 1 },
            { x: 0.333, y: 0, width: 0.334, height: 1 },
            { x: 0.667, y: 0, width: 0.333, height: 1 },
        ]
    },
    {
        id: 'horizontal-4',
        name: '4 Horizontal',
        slots: [
            { x: 0, y: 0, width: 0.25, height: 1 },
            { x: 0.25, y: 0, width: 0.25, height: 1 },
            { x: 0.5, y: 0, width: 0.25, height: 1 },
            { x: 0.75, y: 0, width: 0.25, height: 1 },
        ]
    },
    {
        id: 'vertical-2',
        name: '2 Vertical',
        slots: [
            { x: 0, y: 0, width: 1, height: 0.5 },
            { x: 0, y: 0.5, width: 1, height: 0.5 },
        ]
    },
    {
        id: 'vertical-3',
        name: '3 Vertical',
        slots: [
            { x: 0, y: 0, width: 1, height: 0.333 },
            { x: 0, y: 0.333, width: 1, height: 0.334 },
            { x: 0, y: 0.667, width: 1, height: 0.333 },
        ]
    },
    {
        id: 'vertical-4',
        name: '4 Vertical',
        slots: [
            { x: 0, y: 0, width: 1, height: 0.25 },
            { x: 0, y: 0.25, width: 1, height: 0.25 },
            { x: 0, y: 0.5, width: 1, height: 0.25 },
            { x: 0, y: 0.75, width: 1, height: 0.25 },
        ]
    },
    {
        id: 'featured-left',
        name: 'Featured Left',
        slots: [
            { x: 0, y: 0, width: 0.6, height: 1 },
            { x: 0.6, y: 0, width: 0.4, height: 0.5 },
            { x: 0.6, y: 0.5, width: 0.4, height: 0.5 },
        ]
    },
    {
        id: 'featured-right',
        name: 'Featured Right',
        slots: [
            { x: 0, y: 0, width: 0.4, height: 0.5 },
            { x: 0, y: 0.5, width: 0.4, height: 0.5 },
            { x: 0.4, y: 0, width: 0.6, height: 1 },
        ]
    },
    {
        id: 'featured-top',
        name: 'Featured Top',
        slots: [
            { x: 0, y: 0, width: 1, height: 0.6 },
            { x: 0, y: 0.6, width: 0.5, height: 0.4 },
            { x: 0.5, y: 0.6, width: 0.5, height: 0.4 },
        ]
    },
    {
        id: 'featured-bottom',
        name: 'Featured Bottom',
        slots: [
            { x: 0, y: 0, width: 0.5, height: 0.4 },
            { x: 0.5, y: 0, width: 0.5, height: 0.4 },
            { x: 0, y: 0.4, width: 1, height: 0.6 },
        ]
    },
    {
        id: 'featured-center',
        name: 'Featured Center',
        slots: [
            { x: 0, y: 0, width: 0.35, height: 0.5 },
            { x: 0, y: 0.5, width: 0.35, height: 0.5 },
            { x: 0.35, y: 0.15, width: 0.3, height: 0.7 },
            { x: 0.65, y: 0, width: 0.35, height: 0.5 },
            { x: 0.65, y: 0.5, width: 0.35, height: 0.5 },
        ]
    },
    {
        id: 'mosaic-1',
        name: 'Mosaic A',
        slots: [
            { x: 0, y: 0, width: 0.5, height: 0.667 },
            { x: 0.5, y: 0, width: 0.5, height: 0.333 },
            { x: 0.5, y: 0.333, width: 0.5, height: 0.333 },
            { x: 0, y: 0.667, width: 0.333, height: 0.333 },
            { x: 0.333, y: 0.667, width: 0.333, height: 0.333 },
            { x: 0.667, y: 0.667, width: 0.333, height: 0.333 },
        ]
    },
    {
        id: 'mosaic-2',
        name: 'Mosaic B',
        slots: [
            { x: 0, y: 0, width: 0.667, height: 0.5 },
            { x: 0.667, y: 0, width: 0.333, height: 0.5 },
            { x: 0, y: 0.5, width: 0.333, height: 0.5 },
            { x: 0.333, y: 0.5, width: 0.667, height: 0.5 },
        ]
    },
    {
        id: 'diagonal',
        name: 'Diagonal',
        slots: [
            { x: 0, y: 0, width: 0.4, height: 0.4 },
            { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
            { x: 0.6, y: 0.6, width: 0.4, height: 0.4 },
        ]
    },
    {
        id: 'polaroid',
        name: 'Polaroid Stack',
        slots: [
            { x: 0.05, y: 0.05, width: 0.5, height: 0.5 },
            { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
            { x: 0.45, y: 0.45, width: 0.5, height: 0.5 },
        ]
    },
    {
        id: 't-shape',
        name: 'T-Shape',
        slots: [
            { x: 0, y: 0, width: 0.333, height: 0.5 },
            { x: 0.333, y: 0, width: 0.334, height: 0.5 },
            { x: 0.667, y: 0, width: 0.333, height: 0.5 },
            { x: 0.25, y: 0.5, width: 0.5, height: 0.5 },
        ]
    },
    {
        id: 'l-shape',
        name: 'L-Shape',
        slots: [
            { x: 0, y: 0, width: 0.5, height: 0.5 },
            { x: 0, y: 0.5, width: 0.5, height: 0.5 },
            { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
        ]
    },
    {
        id: 'cross',
        name: 'Cross',
        slots: [
            { x: 0.333, y: 0, width: 0.334, height: 0.333 },
            { x: 0, y: 0.333, width: 0.333, height: 0.334 },
            { x: 0.333, y: 0.333, width: 0.334, height: 0.334 },
            { x: 0.667, y: 0.333, width: 0.333, height: 0.334 },
            { x: 0.333, y: 0.667, width: 0.334, height: 0.333 },
        ]
    },
    {
        id: 'window',
        name: 'Window',
        slots: [
            { x: 0.05, y: 0.05, width: 0.44, height: 0.44 },
            { x: 0.51, y: 0.05, width: 0.44, height: 0.44 },
            { x: 0.05, y: 0.51, width: 0.44, height: 0.44 },
            { x: 0.51, y: 0.51, width: 0.44, height: 0.44 },
        ]
    },
    {
        id: 'filmstrip',
        name: 'Film Strip',
        slots: [
            { x: 0.1, y: 0.05, width: 0.8, height: 0.28 },
            { x: 0.1, y: 0.36, width: 0.8, height: 0.28 },
            { x: 0.1, y: 0.67, width: 0.8, height: 0.28 },
        ]
    },
    {
        id: 'banner-top',
        name: 'Banner Top',
        slots: [
            { x: 0, y: 0, width: 1, height: 0.35 },
            { x: 0, y: 0.35, width: 0.333, height: 0.65 },
            { x: 0.333, y: 0.35, width: 0.334, height: 0.65 },
            { x: 0.667, y: 0.35, width: 0.333, height: 0.65 },
        ]
    },
    {
        id: 'gallery',
        name: 'Gallery',
        slots: [
            { x: 0, y: 0.1, width: 0.333, height: 0.8 },
            { x: 0.333, y: 0, width: 0.334, height: 1 },
            { x: 0.667, y: 0.1, width: 0.333, height: 0.8 },
        ]
    },
]

interface TextElement {
    id: string
    type: 'text'
    content: string
    x: number
    y: number
    width: number
    height: number
    fontSize: number
    fontFamily: string
    color: string
    alignment: 'left' | 'center' | 'right'
    bold: boolean
    italic: boolean
    shadowEnabled: boolean
    shadowColor: string
    shadowBlur: number
    shadowOffsetX: number
    shadowOffsetY: number
    outlineEnabled: boolean
    outlineColor: string
    outlineWidth: number
    opacity: number
}

interface ImageElement {
    id: string
    type: 'image'
    src: string
    x: number
    y: number
    width: number
    height: number
    originalWidth: number
    originalHeight: number
    opacity: number
}

interface CollageElement {
    id: string
    type: 'collage'
    x: number
    y: number
    width: number
    height: number
    templateId: string
    slots: CollageSlot[]
    padding: number
    borderRadius: number
    backgroundColor: string
    borderColor: string
    borderWidth: number
    opacity: number
}

type CanvasElement = TextElement | ImageElement | CollageElement

const FONTS = [
    'Inter',
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Impact',
    'Comic Sans MS',
    'Trebuchet MS',
    'Verdana',
    'Palatino Linotype',
    'Lucida Console'
]

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

export default function ImageEditor() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())
    const animationFrameRef = useRef<number | null>(null)
    const elementsRef = useRef<CanvasElement[]>([])

    const [elements, setElements] = useState<CanvasElement[]>([])
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeHandle, setResizeHandle] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, elX: 0, elY: 0, fontSize: 0 })
    const [canvasScale, setCanvasScale] = useState(1)
    const [backgroundColor, setBackgroundColor] = useState('#1c1917')
    const [cursorStyle, setCursorStyle] = useState('default')
    const [isEditingText, setIsEditingText] = useState(false)
    const [editingTextValue, setEditingTextValue] = useState('')
    const [lockAspectRatio, setLockAspectRatio] = useState(true)
    const [alignmentGuides, setAlignmentGuides] = useState<{ type: 'h' | 'v'; position: number }[]>([])
    const [hoveredSlot, setHoveredSlot] = useState<{ collageId: string; slotId: string } | null>(null)
    const [isDraggingSlotImage, setIsDraggingSlotImage] = useState(false)
    const [slotImageDragStart, setSlotImageDragStart] = useState<{ x: number; y: number; imageX: number; imageY: number } | null>(null)
    const [isTemplatesCollapsed, setIsTemplatesCollapsed] = useState(true)
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
    const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
    const textInputRef = useRef<HTMLInputElement>(null)
    const slotImageInputRef = useRef<HTMLInputElement>(null)

    // Keep elementsRef in sync
    useEffect(() => {
        elementsRef.current = elements
    }, [elements])

    const SNAP_THRESHOLD = 5 // pixels to snap to alignment

    const selectedElement = elements.find(el => el.id === selectedElementId)

    // Get cursor style based on resize handle
    const getCursorForHandle = (handle: string | null): string => {
        switch (handle) {
            case 'tl': case 'br': return 'nwse-resize'
            case 'tr': case 'bl': return 'nesw-resize'
            default: return 'default'
        }
    }

    // Calculate alignment guides for an element being dragged (throttled)
    const calculateAlignmentGuides = useCallback((draggedEl: CanvasElement, newX: number, newY: number) => {
        const guides: { type: 'h' | 'v'; position: number }[] = []
        const draggedWidth = draggedEl.type === 'image' ? draggedEl.width : (draggedEl as TextElement).width
        const draggedHeight = draggedEl.type === 'image' ? draggedEl.height : (draggedEl as TextElement).height
        
        // Dragged element edges and center
        const draggedLeft = newX
        const draggedRight = newX + draggedWidth
        const draggedTop = newY
        const draggedBottom = newY + draggedHeight
        const draggedCenterX = newX + draggedWidth / 2
        const draggedCenterY = newY + draggedHeight / 2
        
        // Canvas center guides
        if (Math.abs(draggedCenterX - CANVAS_WIDTH / 2) < SNAP_THRESHOLD) {
            guides.push({ type: 'v', position: CANVAS_WIDTH / 2 })
        }
        if (Math.abs(draggedCenterY - CANVAS_HEIGHT / 2) < SNAP_THRESHOLD) {
            guides.push({ type: 'h', position: CANVAS_HEIGHT / 2 })
        }
        
        // Compare with other elements (use ref to avoid stale closure)
        elementsRef.current.forEach(el => {
            if (el.id === draggedEl.id) return
            
            const elWidth = el.type === 'image' ? el.width : (el as TextElement).width
            const elHeight = el.type === 'image' ? el.height : (el as TextElement).height
            const elLeft = el.x
            const elRight = el.x + elWidth
            const elTop = el.y
            const elBottom = el.y + elHeight
            const elCenterX = el.x + elWidth / 2
            const elCenterY = el.y + elHeight / 2
            
            // Vertical guides (for horizontal alignment)
            if (Math.abs(draggedLeft - elLeft) < SNAP_THRESHOLD) guides.push({ type: 'v', position: elLeft })
            if (Math.abs(draggedLeft - elRight) < SNAP_THRESHOLD) guides.push({ type: 'v', position: elRight })
            if (Math.abs(draggedRight - elLeft) < SNAP_THRESHOLD) guides.push({ type: 'v', position: elLeft })
            if (Math.abs(draggedRight - elRight) < SNAP_THRESHOLD) guides.push({ type: 'v', position: elRight })
            if (Math.abs(draggedCenterX - elCenterX) < SNAP_THRESHOLD) guides.push({ type: 'v', position: elCenterX })
            
            // Horizontal guides (for vertical alignment)
            if (Math.abs(draggedTop - elTop) < SNAP_THRESHOLD) guides.push({ type: 'h', position: elTop })
            if (Math.abs(draggedTop - elBottom) < SNAP_THRESHOLD) guides.push({ type: 'h', position: elBottom })
            if (Math.abs(draggedBottom - elTop) < SNAP_THRESHOLD) guides.push({ type: 'h', position: elTop })
            if (Math.abs(draggedBottom - elBottom) < SNAP_THRESHOLD) guides.push({ type: 'h', position: elBottom })
            if (Math.abs(draggedCenterY - elCenterY) < SNAP_THRESHOLD) guides.push({ type: 'h', position: elCenterY })
        })
        
        return guides
    }, [])

    // Calculate canvas scale to fit container
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth - 48
                const scale = Math.min(containerWidth / CANVAS_WIDTH, 0.8)
                setCanvasScale(scale)
            }
        }
        updateScale()
        window.addEventListener('resize', updateScale)
        return () => window.removeEventListener('resize', updateScale)
    }, [])

    // Global mouse event handlers for drag/resize outside canvas
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging && !isResizing) return
            
            const canvas = canvasRef.current
            if (!canvas) return
            
            const rect = canvas.getBoundingClientRect()
            const x = (e.clientX - rect.left) / canvasScale
            const y = (e.clientY - rect.top) / canvasScale
            
            if (isResizing && selectedElementId) {
                const el = elementsRef.current.find(e => e.id === selectedElementId)
                if (!el) return
                
                if (el.type === 'image') {
                    const imgEl = el as ImageElement
                    const aspectRatio = imgEl.originalWidth / imgEl.originalHeight
                    
                    let newWidth = resizeStart.width
                    let newHeight = resizeStart.height
                    let newX = resizeStart.elX
                    let newY = resizeStart.elY
                    
                    const dx = x - resizeStart.x
                    const dy = y - resizeStart.y
                    
                    if (lockAspectRatio) {
                        switch (resizeHandle) {
                            case 'br':
                                newWidth = Math.max(50, resizeStart.width + dx)
                                newHeight = newWidth / aspectRatio
                                break
                            case 'bl':
                                newWidth = Math.max(50, resizeStart.width - dx)
                                newHeight = newWidth / aspectRatio
                                newX = resizeStart.elX + resizeStart.width - newWidth
                                break
                            case 'tr':
                                newWidth = Math.max(50, resizeStart.width + dx)
                                newHeight = newWidth / aspectRatio
                                newY = resizeStart.elY + resizeStart.height - newHeight
                                break
                            case 'tl':
                                newWidth = Math.max(50, resizeStart.width - dx)
                                newHeight = newWidth / aspectRatio
                                newX = resizeStart.elX + resizeStart.width - newWidth
                                newY = resizeStart.elY + resizeStart.height - newHeight
                                break
                        }
                    } else {
                        switch (resizeHandle) {
                            case 'br':
                                newWidth = Math.max(50, resizeStart.width + dx)
                                newHeight = Math.max(50, resizeStart.height + dy)
                                break
                            case 'bl':
                                newWidth = Math.max(50, resizeStart.width - dx)
                                newHeight = Math.max(50, resizeStart.height + dy)
                                newX = resizeStart.elX + resizeStart.width - newWidth
                                break
                            case 'tr':
                                newWidth = Math.max(50, resizeStart.width + dx)
                                newHeight = Math.max(50, resizeStart.height - dy)
                                newY = resizeStart.elY + resizeStart.height - newHeight
                                break
                            case 'tl':
                                newWidth = Math.max(50, resizeStart.width - dx)
                                newHeight = Math.max(50, resizeStart.height - dy)
                                newX = resizeStart.elX + resizeStart.width - newWidth
                                newY = resizeStart.elY + resizeStart.height - newHeight
                                break
                        }
                    }
                    
                    setElements(prev => prev.map(e => {
                        if (e.id === selectedElementId && e.type === 'image') {
                            return { ...e, width: newWidth, height: newHeight, x: newX, y: newY } as ImageElement
                        }
                        return e
                    }))
                } else if (el.type === 'text') {
                    // Handle text resize
                    let newWidth = resizeStart.width
                    let newHeight = resizeStart.height
                    let newX = resizeStart.elX
                    let newY = resizeStart.elY
                    
                    const dx = x - resizeStart.x
                    
                    switch (resizeHandle) {
                        case 'br':
                            newWidth = Math.max(50, resizeStart.width + dx)
                            newHeight = resizeStart.height * (newWidth / resizeStart.width)
                            break
                        case 'bl':
                            newWidth = Math.max(50, resizeStart.width - dx)
                            newHeight = resizeStart.height * (newWidth / resizeStart.width)
                            newX = resizeStart.elX + resizeStart.width - newWidth
                            break
                        case 'tr':
                            newWidth = Math.max(50, resizeStart.width + dx)
                            newHeight = resizeStart.height * (newWidth / resizeStart.width)
                            newY = resizeStart.elY + resizeStart.height - newHeight
                            break
                        case 'tl':
                            newWidth = Math.max(50, resizeStart.width - dx)
                            newHeight = resizeStart.height * (newWidth / resizeStart.width)
                            newX = resizeStart.elX + resizeStart.width - newWidth
                            newY = resizeStart.elY + resizeStart.height - newHeight
                            break
                    }
                    
                    const newFontSize = Math.max(12, Math.round(resizeStart.fontSize * (newWidth / resizeStart.width)))
                    
                    setElements(prev => prev.map(e => {
                        if (e.id === selectedElementId && e.type === 'text') {
                            return { ...e, width: newWidth, height: newHeight, x: newX, y: newY, fontSize: newFontSize } as TextElement
                        }
                        return e
                    }))
                }
            } else if (isDragging && selectedElementId) {
                const el = elementsRef.current.find(e => e.id === selectedElementId)
                if (el) {
                    const newX = x - dragOffset.x
                    const newY = y - dragOffset.y
                    const guides = calculateAlignmentGuides(el, newX, newY)
                    setAlignmentGuides(guides)
                }
                setElements(prev => prev.map(e =>
                    e.id === selectedElementId
                        ? { ...e, x: x - dragOffset.x, y: y - dragOffset.y }
                        : e
                ))
            }
        }
        
        const handleGlobalMouseUp = () => {
            setIsDragging(false)
            setIsResizing(false)
            setResizeHandle(null)
            setAlignmentGuides([])
        }
        
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleGlobalMouseMove)
            window.addEventListener('mouseup', handleGlobalMouseUp)
        }
        
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove)
            window.removeEventListener('mouseup', handleGlobalMouseUp)
        }
    }, [isDragging, isResizing, selectedElementId, canvasScale, resizeStart, resizeHandle, dragOffset, lockAspectRatio])

    // Get or create cached image
    const getCachedImage = useCallback((src: string): HTMLImageElement | null => {
        if (imageCache.current.has(src)) {
            return imageCache.current.get(src)!
        }
        const img = new Image()
        img.src = src
        img.onload = () => {
            imageCache.current.set(src, img)
            // Trigger re-render when image loads
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            animationFrameRef.current = requestAnimationFrame(renderCanvasInternal)
        }
        return null
    }, [])

    // Internal render function (no dependencies to avoid recreation)
    const renderCanvasInternal = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear and fill background
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        // Render elements in order
        elements.forEach(element => {
            // Apply element opacity
            ctx.save()
            ctx.globalAlpha = element.opacity ?? 1
            
            if (element.type === 'image') {
                const cachedImg = imageCache.current.get(element.src)
                if (cachedImg && cachedImg.complete) {
                    ctx.drawImage(cachedImg, element.x, element.y, element.width, element.height)
                } else {
                    // Load image into cache
                    getCachedImage(element.src)
                    // Draw placeholder
                    ctx.fillStyle = '#292524'
                    ctx.fillRect(element.x, element.y, element.width, element.height)
                }
                ctx.restore()
            } else if (element.type === 'text') {
                const fontStyle = `${element.italic ? 'italic ' : ''}${element.bold ? 'bold ' : ''}${element.fontSize}px ${element.fontFamily}`
                ctx.font = fontStyle
                ctx.textAlign = element.alignment
                ctx.textBaseline = 'top'

                // Shadow
                if (element.shadowEnabled) {
                    ctx.shadowColor = element.shadowColor
                    ctx.shadowBlur = element.shadowBlur
                    ctx.shadowOffsetX = element.shadowOffsetX
                    ctx.shadowOffsetY = element.shadowOffsetY
                }

                // Calculate x based on alignment using element width
                let textX = element.x
                if (element.alignment === 'center') textX = element.x + element.width / 2
                else if (element.alignment === 'right') textX = element.x + element.width

                // Outline
                if (element.outlineEnabled) {
                    ctx.strokeStyle = element.outlineColor
                    ctx.lineWidth = element.outlineWidth
                    ctx.strokeText(element.content, textX, element.y)
                }

                // Fill text
                ctx.fillStyle = element.color
                ctx.fillText(element.content, textX, element.y)

                ctx.restore()
            } else if (element.type === 'collage') {
                const collage = element as CollageElement
                
                // Draw collage background
                ctx.fillStyle = collage.backgroundColor
                if (collage.borderRadius > 0) {
                    ctx.beginPath()
                    ctx.roundRect(collage.x, collage.y, collage.width, collage.height, collage.borderRadius)
                    ctx.fill()
                } else {
                    ctx.fillRect(collage.x, collage.y, collage.width, collage.height)
                }
                
                // Draw each slot
                collage.slots.forEach(slot => {
                    const slotX = collage.x + slot.x * collage.width + collage.padding
                    const slotY = collage.y + slot.y * collage.height + collage.padding
                    const slotWidth = slot.width * collage.width - collage.padding * 2
                    const slotHeight = slot.height * collage.height - collage.padding * 2
                    
                    // Draw slot background/border
                    ctx.strokeStyle = collage.borderColor
                    ctx.lineWidth = collage.borderWidth
                    if (collage.borderRadius > 0) {
                        ctx.beginPath()
                        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, collage.borderRadius / 2)
                        ctx.stroke()
                    } else {
                        ctx.strokeRect(slotX, slotY, slotWidth, slotHeight)
                    }
                    
                    // Draw image if exists
                    if (slot.imageSrc) {
                        const cachedImg = imageCache.current.get(slot.imageSrc)
                        if (cachedImg && cachedImg.complete) {
                            ctx.save()
                            // Clip to slot
                            ctx.beginPath()
                            if (collage.borderRadius > 0) {
                                ctx.roundRect(slotX, slotY, slotWidth, slotHeight, collage.borderRadius / 2)
                            } else {
                                ctx.rect(slotX, slotY, slotWidth, slotHeight)
                            }
                            ctx.clip()
                            
                            // Calculate image dimensions to fill slot
                            const imgAspect = cachedImg.width / cachedImg.height
                            const slotAspect = slotWidth / slotHeight
                            let drawWidth, drawHeight
                            
                            if (imgAspect > slotAspect) {
                                drawHeight = slotHeight * slot.imageHeight
                                drawWidth = drawHeight * imgAspect
                            } else {
                                drawWidth = slotWidth * slot.imageWidth
                                drawHeight = drawWidth / imgAspect
                            }
                            
                            const drawX = slotX + (slotWidth - drawWidth) / 2 + slot.imageX * slotWidth
                            const drawY = slotY + (slotHeight - drawHeight) / 2 + slot.imageY * slotHeight
                            
                            ctx.drawImage(cachedImg, drawX, drawY, drawWidth, drawHeight)
                            ctx.restore()
                        } else {
                            getCachedImage(slot.imageSrc)
                            // Draw placeholder
                            ctx.fillStyle = '#3f3f46'
                            ctx.fillRect(slotX + 2, slotY + 2, slotWidth - 4, slotHeight - 4)
                        }
                    } else {
                        // Empty slot indicator
                        ctx.fillStyle = '#27272a'
                        ctx.fillRect(slotX + 2, slotY + 2, slotWidth - 4, slotHeight - 4)
                        ctx.fillStyle = '#52525b'
                        ctx.font = '14px Inter'
                        ctx.textAlign = 'center'
                        ctx.textBaseline = 'middle'
                        ctx.fillText('Drop Image', slotX + slotWidth / 2, slotY + slotHeight / 2)
                    }
                    
                    // Highlight selected slot
                    if (slot.id === selectedSlotId && element.id === selectedElementId) {
                        ctx.strokeStyle = '#22d3ee'
                        ctx.lineWidth = 3
                        ctx.setLineDash([])
                        ctx.strokeRect(slotX - 1, slotY - 1, slotWidth + 2, slotHeight + 2)
                    }
                    
                    // Highlight hovered slot (during image drag) in blue
                    if (hoveredSlot && hoveredSlot.collageId === element.id && hoveredSlot.slotId === slot.id) {
                        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
                        ctx.fillRect(slotX, slotY, slotWidth, slotHeight)
                        ctx.strokeStyle = '#3b82f6'
                        ctx.lineWidth = 3
                        ctx.setLineDash([])
                        ctx.strokeRect(slotX - 1, slotY - 1, slotWidth + 2, slotHeight + 2)
                    }
                })
                
                ctx.restore()
            }

            // Selection indicator with resize handles
            if (element.id === selectedElementId) {
                ctx.save()
                ctx.strokeStyle = '#f5a623'
                ctx.lineWidth = 2
                ctx.setLineDash([5, 5])
                
                const elWidth = element.width
                const elHeight = element.height
                
                ctx.strokeRect(element.x - 2, element.y - 2, elWidth + 4, elHeight + 4)
                
                // Draw resize handles (corners) for image and text (not collage when at full canvas size)
                if (element.type !== 'collage' || element.width < CANVAS_WIDTH || element.height < CANVAS_HEIGHT) {
                    ctx.setLineDash([])
                    ctx.fillStyle = '#f5a623'
                    const handleSize = 10
                    // Top-left
                    ctx.fillRect(element.x - handleSize/2, element.y - handleSize/2, handleSize, handleSize)
                    // Top-right
                    ctx.fillRect(element.x + elWidth - handleSize/2, element.y - handleSize/2, handleSize, handleSize)
                    // Bottom-left
                    ctx.fillRect(element.x - handleSize/2, element.y + elHeight - handleSize/2, handleSize, handleSize)
                    // Bottom-right
                    ctx.fillRect(element.x + elWidth - handleSize/2, element.y + elHeight - handleSize/2, handleSize, handleSize)
                }
                
                ctx.restore()
            }
        })

        // Draw alignment guides
        if (alignmentGuides.length > 0) {
            ctx.save()
            ctx.strokeStyle = '#22d3ee' // Cyan color for guides
            ctx.lineWidth = 1
            ctx.setLineDash([4, 4])
            
            alignmentGuides.forEach(guide => {
                ctx.beginPath()
                if (guide.type === 'v') {
                    // Vertical line
                    ctx.moveTo(guide.position, 0)
                    ctx.lineTo(guide.position, CANVAS_HEIGHT)
                } else {
                    // Horizontal line
                    ctx.moveTo(0, guide.position)
                    ctx.lineTo(CANVAS_WIDTH, guide.position)
                }
                ctx.stroke()
            })
            ctx.restore()
        }
    }, [elements, selectedElementId, selectedSlotId, backgroundColor, isEditingText, alignmentGuides, hoveredSlot, getCachedImage])

    // Throttled render using requestAnimationFrame
    const scheduleRender = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
        }
        animationFrameRef.current = requestAnimationFrame(renderCanvasInternal)
    }, [renderCanvasInternal])

    useEffect(() => {
        scheduleRender()
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [scheduleRender])

    // Add text element
    const addTextElement = () => {
        const newText: TextElement = {
            id: `text-${Date.now()}`,
            type: 'text',
            content: 'New Text',
            x: CANVAS_WIDTH / 2 - 150,
            y: CANVAS_HEIGHT / 2 - 30,
            width: 300,
            height: 60,
            fontSize: 48,
            fontFamily: 'Inter',
            color: '#ffffff',
            alignment: 'center',
            bold: false,
            italic: false,
            shadowEnabled: false,
            shadowColor: '#000000',
            shadowBlur: 4,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            outlineEnabled: false,
            outlineColor: '#000000',
            outlineWidth: 2,
            opacity: 1
        }
        setElements(prev => [...prev, newText])
        setSelectedElementId(newText.id)
    }

    // Add image element
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        Array.from(files).forEach(file => {
            const reader = new FileReader()
            reader.onload = (event) => {
                const img = new Image()
                img.onload = () => {
                    const aspectRatio = img.width / img.height
                    let width = 400
                    let height = width / aspectRatio

                    if (height > 400) {
                        height = 400
                        width = height * aspectRatio
                    }

                    const newImage: ImageElement = {
                        id: `image-${Date.now()}-${Math.random()}`,
                        type: 'image',
                        src: event.target?.result as string,
                        x: (CANVAS_WIDTH - width) / 2,
                        y: (CANVAS_HEIGHT - height) / 2,
                        width,
                        height,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        opacity: 1
                    }
                    setElements(prev => [...prev, newImage])
                    setSelectedElementId(newImage.id)
                }
                img.src = event.target?.result as string
            }
            reader.readAsDataURL(file)
        })
        e.target.value = ''
    }

    // Create collage element from template
    const addCollageElement = (templateId: string) => {
        const template = COLLAGE_TEMPLATES.find(t => t.id === templateId)
        if (!template) return

        const slots: CollageSlot[] = template.slots.map((slot, index) => ({
            id: `slot-${Date.now()}-${index}`,
            x: slot.x,
            y: slot.y,
            width: slot.width,
            height: slot.height,
            imageX: 0,
            imageY: 0,
            imageWidth: 1,
            imageHeight: 1
        }))

        const newCollage: CollageElement = {
            id: `collage-${Date.now()}`,
            type: 'collage',
            x: 0,
            y: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            templateId,
            slots,
            padding: 10,
            borderRadius: 0,
            backgroundColor: '#1c1917',
            borderColor: '#292524',
            borderWidth: 2,
            opacity: 1
        }
        setElements(prev => [...prev, newCollage])
        setSelectedElementId(newCollage.id)
    }

    // Change template of existing collage (preserving images)
    const changeCollageTemplate = (templateId: string) => {
        if (!selectedElementId) return
        const currentElement = elements.find(el => el.id === selectedElementId)
        if (!currentElement || currentElement.type !== 'collage') return
        
        const template = COLLAGE_TEMPLATES.find(t => t.id === templateId)
        if (!template) return
        
        const currentCollage = currentElement as CollageElement
        // Collect existing images from current slots
        const existingImages = currentCollage.slots
            .filter(slot => slot.imageSrc)
            .map(slot => ({
                imageSrc: slot.imageSrc,
                imageX: slot.imageX,
                imageY: slot.imageY,
                imageWidth: slot.imageWidth,
                imageHeight: slot.imageHeight
            }))
        
        // Create new slots and preserve images in order
        const newSlots: CollageSlot[] = template.slots.map((slot, index) => {
            const existingImage = existingImages[index]
            return {
                id: `slot-${Date.now()}-${index}`,
                x: slot.x,
                y: slot.y,
                width: slot.width,
                height: slot.height,
                imageSrc: existingImage?.imageSrc,
                imageX: existingImage?.imageX ?? 0,
                imageY: existingImage?.imageY ?? 0,
                imageWidth: existingImage?.imageWidth ?? 1,
                imageHeight: existingImage?.imageHeight ?? 1
            }
        })
        
        setElements(prev => prev.map(el => {
            if (el.id === selectedElementId && el.type === 'collage') {
                return { ...el, templateId, slots: newSlots } as CollageElement
            }
            return el
        }))
        setSelectedSlotId(null)
    }

    // Handle template button click - show dialog if collage is selected
    const handleTemplateClick = (templateId: string) => {
        const hasSelectedCollage = selectedElement?.type === 'collage'
        if (hasSelectedCollage) {
            setPendingTemplateId(templateId)
            setTemplateDialogOpen(true)
        } else {
            addCollageElement(templateId)
        }
    }

    // Handle image upload to collage slot
    const handleSlotImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0 || !selectedElementId || !selectedSlotId) return

        const file = files[0]
        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
                // Cache the image
                imageCache.current.set(event.target?.result as string, img)
                
                setElements(prev => prev.map(el => {
                    if (el.id === selectedElementId && el.type === 'collage') {
                        const collage = el as CollageElement
                        return {
                            ...collage,
                            slots: collage.slots.map(slot => {
                                if (slot.id === selectedSlotId) {
                                    return {
                                        ...slot,
                                        imageSrc: event.target?.result as string,
                                        imageX: 0,
                                        imageY: 0,
                                        imageWidth: 1,
                                        imageHeight: 1,
                                        originalWidth: img.width,
                                        originalHeight: img.height
                                    }
                                }
                                return slot
                            })
                        } as CollageElement
                    }
                    return el
                }))
            }
            img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    // Update collage element
    const updateCollageElement = (updates: Partial<CollageElement>) => {
        if (!selectedElementId || selectedElement?.type !== 'collage') return
        setElements(prev => prev.map(el => {
            if (el.id === selectedElementId && el.type === 'collage') {
                return { ...el, ...updates } as CollageElement
            }
            return el
        }))
    }

    // Delete selected element
    const deleteSelectedElement = () => {
        if (!selectedElementId) return
        setElements(prev => prev.filter(el => el.id !== selectedElementId))
        setSelectedElementId(null)
        setSelectedSlotId(null)
    }

    // Duplicate selected element
    const duplicateSelectedElement = () => {
        if (!selectedElement) return
        const newElement = {
            ...selectedElement,
            id: `${selectedElement.type}-${Date.now()}`,
            x: selectedElement.x + 20,
            y: selectedElement.y + 20
        }
        setElements(prev => [...prev, newElement])
        setSelectedElementId(newElement.id)
    }

    // Move element layer
    const moveElementLayer = (direction: 'up' | 'down') => {
        if (!selectedElementId) return
        const index = elements.findIndex(el => el.id === selectedElementId)
        if (index === -1) return

        const newElements = [...elements]
        if (direction === 'up' && index < elements.length - 1) {
            [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]]
        } else if (direction === 'down' && index > 0) {
            [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]]
        }
        setElements(newElements)
    }

    // Update text element
    const updateTextElement = (updates: Partial<TextElement>) => {
        if (!selectedElementId || selectedElement?.type !== 'text') return
        setElements(prev => prev.map(el => {
            if (el.id === selectedElementId && el.type === 'text') {
                return { ...el, ...updates } as TextElement
            }
            return el
        }))
    }

    // Update image element
    const updateImageElement = (updates: Partial<ImageElement>) => {
        if (!selectedElementId || selectedElement?.type !== 'image') return
        setElements(prev => prev.map(el => {
            if (el.id === selectedElementId && el.type === 'image') {
                return { ...el, ...updates } as ImageElement
            }
            return el
        }))
    }

    // Check if point is on a resize handle (works for both image and text)
    const getResizeHandle = (x: number, y: number, el: { x: number; y: number; width: number; height: number }): string | null => {
        const handleSize = 15 // Slightly larger hit area than visual
        
        // Top-left
        if (x >= el.x - handleSize/2 && x <= el.x + handleSize/2 &&
            y >= el.y - handleSize/2 && y <= el.y + handleSize/2) return 'tl'
        // Top-right
        if (x >= el.x + el.width - handleSize/2 && x <= el.x + el.width + handleSize/2 &&
            y >= el.y - handleSize/2 && y <= el.y + handleSize/2) return 'tr'
        // Bottom-left
        if (x >= el.x - handleSize/2 && x <= el.x + handleSize/2 &&
            y >= el.y + el.height - handleSize/2 && y <= el.y + el.height + handleSize/2) return 'bl'
        // Bottom-right
        if (x >= el.x + el.width - handleSize/2 && x <= el.x + el.width + handleSize/2 &&
            y >= el.y + el.height - handleSize/2 && y <= el.y + el.height + handleSize/2) return 'br'
        
        return null
    }

    // Canvas mouse handlers
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) / canvasScale
        const y = (e.clientY - rect.top) / canvasScale

        // Check if clicking on resize handle of selected element (image or text, not collage)
        if (selectedElementId && selectedElement && selectedElement.type !== 'collage') {
            const handle = getResizeHandle(x, y, selectedElement as { x: number; y: number; width: number; height: number })
            if (handle) {
                setIsResizing(true)
                setResizeHandle(handle)
                setResizeStart({
                    x,
                    y,
                    width: selectedElement.width,
                    height: selectedElement.height,
                    elX: selectedElement.x,
                    elY: selectedElement.y,
                    fontSize: selectedElement.type === 'text' ? (selectedElement as TextElement).fontSize : 0
                })
                return
            }
        }

        // Find clicked element (reverse order for top element) - check images/text BEFORE collages
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i]
            let hit = false

            if (el.type === 'image') {
                hit = x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
            } else if (el.type === 'text') {
                hit = x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
            } else if (el.type === 'collage') {
                // For collages, check slots first
                const collage = el as CollageElement
                for (const slot of collage.slots) {
                    const slotX = collage.x + slot.x * collage.width + collage.padding
                    const slotY = collage.y + slot.y * collage.height + collage.padding
                    const slotWidth = slot.width * collage.width - collage.padding * 2
                    const slotHeight = slot.height * collage.height - collage.padding * 2
                    
                    if (x >= slotX && x <= slotX + slotWidth && y >= slotY && y <= slotY + slotHeight) {
                        setSelectedElementId(collage.id)
                        setSelectedSlotId(slot.id)
                        // If slot has an image, start dragging it
                        if (slot.imageSrc) {
                            setIsDraggingSlotImage(true)
                            setSlotImageDragStart({
                                x,
                                y,
                                imageX: slot.imageX,
                                imageY: slot.imageY
                            })
                        }
                        return
                    }
                }
                // Clicked on collage but not on a slot (padding area)
                hit = x >= collage.x && x <= collage.x + collage.width && y >= collage.y && y <= collage.y + collage.height
            }

            if (hit) {
                setSelectedElementId(el.id)
                setSelectedSlotId(null)
                setIsDragging(true)
                setDragOffset({ x: x - el.x, y: y - el.y })
                return
            }
        }

        setSelectedElementId(null)
        setSelectedSlotId(null)
        setIsEditingText(false)
    }

    // Handle double click for text editing
    const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) / canvasScale
        const y = (e.clientY - rect.top) / canvasScale

        // Find clicked text element
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i]
            if (el.type === 'text') {
                const hit = x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
                if (hit) {
                    setSelectedElementId(el.id)
                    setIsEditingText(true)
                    setEditingTextValue(el.content)
                    setTimeout(() => textInputRef.current?.focus(), 50)
                    return
                }
            }
            // Double-click on image to fit canvas
            if (el.type === 'image') {
                const hit = x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
                if (hit) {
                    const imgEl = el as ImageElement
                    const aspectRatio = imgEl.originalWidth / imgEl.originalHeight
                    let newWidth = CANVAS_WIDTH
                    let newHeight = CANVAS_WIDTH / aspectRatio
                    
                    if (newHeight > CANVAS_HEIGHT) {
                        newHeight = CANVAS_HEIGHT
                        newWidth = newHeight * aspectRatio
                    }
                    
                    setElements(prev => prev.map(e => {
                        if (e.id === el.id && e.type === 'image') {
                            return {
                                ...e,
                                width: newWidth,
                                height: newHeight,
                                x: (CANVAS_WIDTH - newWidth) / 2,
                                y: (CANVAS_HEIGHT - newHeight) / 2
                            } as ImageElement
                        }
                        return e
                    }))
                    setSelectedElementId(el.id)
                    return
                }
            }
        }
    }

    // Finish text editing
    const finishTextEditing = () => {
        if (isEditingText && selectedElementId) {
            setElements(prev => prev.map(el => {
                if (el.id === selectedElementId && el.type === 'text') {
                    return { ...el, content: editingTextValue } as TextElement
                }
                return el
            }))
        }
        setIsEditingText(false)
    }

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) / canvasScale
        const y = (e.clientY - rect.top) / canvasScale

        // Handle resizing for images
        if (isResizing && selectedElementId && selectedElement?.type === 'image') {
            const imgEl = selectedElement as ImageElement
            const aspectRatio = imgEl.originalWidth / imgEl.originalHeight
            
            let newWidth = resizeStart.width
            let newHeight = resizeStart.height
            let newX = resizeStart.elX
            let newY = resizeStart.elY
            
            const dx = x - resizeStart.x
            const dy = y - resizeStart.y
            
            if (lockAspectRatio) {
                // Proportional resize based on horizontal drag
                switch (resizeHandle) {
                    case 'br':
                        newWidth = Math.max(50, resizeStart.width + dx)
                        newHeight = newWidth / aspectRatio
                        newX = resizeStart.elX
                        newY = resizeStart.elY
                        break
                    case 'bl':
                        newWidth = Math.max(50, resizeStart.width - dx)
                        newHeight = newWidth / aspectRatio
                        newX = resizeStart.elX + resizeStart.width - newWidth
                        newY = resizeStart.elY
                        break
                    case 'tr':
                        newWidth = Math.max(50, resizeStart.width + dx)
                        newHeight = newWidth / aspectRatio
                        newX = resizeStart.elX
                        newY = resizeStart.elY + resizeStart.height - newHeight
                        break
                    case 'tl':
                        newWidth = Math.max(50, resizeStart.width - dx)
                        newHeight = newWidth / aspectRatio
                        newX = resizeStart.elX + resizeStart.width - newWidth
                        newY = resizeStart.elY + resizeStart.height - newHeight
                        break
                }
            } else {
                // Free resize - width and height independent
                switch (resizeHandle) {
                    case 'br':
                        newWidth = Math.max(50, resizeStart.width + dx)
                        newHeight = Math.max(50, resizeStart.height + dy)
                        newX = resizeStart.elX
                        newY = resizeStart.elY
                        break
                    case 'bl':
                        newWidth = Math.max(50, resizeStart.width - dx)
                        newHeight = Math.max(50, resizeStart.height + dy)
                        newX = resizeStart.elX + resizeStart.width - newWidth
                        newY = resizeStart.elY
                        break
                    case 'tr':
                        newWidth = Math.max(50, resizeStart.width + dx)
                        newHeight = Math.max(50, resizeStart.height - dy)
                        newX = resizeStart.elX
                        newY = resizeStart.elY + resizeStart.height - newHeight
                        break
                    case 'tl':
                        newWidth = Math.max(50, resizeStart.width - dx)
                        newHeight = Math.max(50, resizeStart.height - dy)
                        newX = resizeStart.elX + resizeStart.width - newWidth
                        newY = resizeStart.elY + resizeStart.height - newHeight
                        break
                }
            }
            
            setElements(prev => prev.map(el => {
                if (el.id === selectedElementId && el.type === 'image') {
                    return { ...el, width: newWidth, height: newHeight, x: newX, y: newY } as ImageElement
                }
                return el
            }))
            return
        }

        // Handle resizing for text (scales fontSize proportionally)
        if (isResizing && selectedElementId && selectedElement?.type === 'text') {
            let newWidth = resizeStart.width
            let newHeight = resizeStart.height
            let newX = resizeStart.elX
            let newY = resizeStart.elY
            
            const dx = x - resizeStart.x
            
            switch (resizeHandle) {
                case 'br': // Bottom-right: anchor top-left
                    newWidth = Math.max(50, resizeStart.width + dx)
                    newHeight = resizeStart.height * (newWidth / resizeStart.width)
                    break
                case 'bl': // Bottom-left: anchor top-right
                    newWidth = Math.max(50, resizeStart.width - dx)
                    newHeight = resizeStart.height * (newWidth / resizeStart.width)
                    newX = resizeStart.elX + resizeStart.width - newWidth
                    break
                case 'tr': // Top-right: anchor bottom-left
                    newWidth = Math.max(50, resizeStart.width + dx)
                    newHeight = resizeStart.height * (newWidth / resizeStart.width)
                    newY = resizeStart.elY + resizeStart.height - newHeight
                    break
                case 'tl': // Top-left: anchor bottom-right
                    newWidth = Math.max(50, resizeStart.width - dx)
                    newHeight = resizeStart.height * (newWidth / resizeStart.width)
                    newX = resizeStart.elX + resizeStart.width - newWidth
                    newY = resizeStart.elY + resizeStart.height - newHeight
                    break
            }
            
            const newFontSize = Math.max(12, Math.round(resizeStart.fontSize * (newWidth / resizeStart.width)))
            
            setElements(prev => prev.map(el => {
                if (el.id === selectedElementId && el.type === 'text') {
                    return { ...el, width: newWidth, height: newHeight, x: newX, y: newY, fontSize: newFontSize } as TextElement
                }
                return el
            }))
            return
        }

        // Update cursor based on hover over resize handles
        if (selectedElementId && selectedElement && !isDragging && !isResizing && !isDraggingSlotImage) {
            const handle = getResizeHandle(x, y, selectedElement as { x: number; y: number; width: number; height: number })
            setCursorStyle(handle ? getCursorForHandle(handle) : selectedSlotId ? 'grab' : 'default')
        }

        // Handle dragging image within slot
        if (isDraggingSlotImage && selectedElementId && selectedSlotId && slotImageDragStart) {
            const dx = (x - slotImageDragStart.x) / 500 // Scale factor for sensitivity
            const dy = (y - slotImageDragStart.y) / 500
            
            const newImageX = Math.max(-0.5, Math.min(0.5, slotImageDragStart.imageX + dx))
            const newImageY = Math.max(-0.5, Math.min(0.5, slotImageDragStart.imageY + dy))
            
            setElements(prev => prev.map(el => {
                if (el.id === selectedElementId && el.type === 'collage') {
                    return {
                        ...el,
                        slots: (el as CollageElement).slots.map(slot =>
                            slot.id === selectedSlotId
                                ? { ...slot, imageX: newImageX, imageY: newImageY }
                                : slot
                        )
                    } as CollageElement
                }
                return el
            }))
            return
        }

        // Handle dragging
        if (!isDragging || !selectedElementId) return

        const newX = x - dragOffset.x
        const newY = y - dragOffset.y
        
        // Calculate alignment guides
        const el = elements.find(e => e.id === selectedElementId)
        if (el) {
            const guides = calculateAlignmentGuides(el, newX, newY)
            setAlignmentGuides(guides)
        }

        // Check if dragging an image over a collage slot
        const draggedEl = elements.find(e => e.id === selectedElementId)
        if (draggedEl && draggedEl.type === 'image') {
            const imgCenterX = newX + draggedEl.width / 2
            const imgCenterY = newY + draggedEl.height / 2
            
            let foundSlot: { collageId: string; slotId: string } | null = null
            
            for (const otherEl of elements) {
                if (otherEl.type === 'collage' && otherEl.id !== selectedElementId) {
                    const collage = otherEl as CollageElement
                    for (const slot of collage.slots) {
                        const slotX = collage.x + slot.x * collage.width + collage.padding
                        const slotY = collage.y + slot.y * collage.height + collage.padding
                        const slotWidth = slot.width * collage.width - collage.padding * 2
                        const slotHeight = slot.height * collage.height - collage.padding * 2
                        
                        if (imgCenterX >= slotX && imgCenterX <= slotX + slotWidth &&
                            imgCenterY >= slotY && imgCenterY <= slotY + slotHeight) {
                            foundSlot = { collageId: collage.id, slotId: slot.id }
                            break
                        }
                    }
                    if (foundSlot) break
                }
            }
            
            setHoveredSlot(foundSlot)
        }

        setElements(prev => prev.map(el =>
            el.id === selectedElementId
                ? { ...el, x: newX, y: newY }
                : el
        ))
    }

    const handleCanvasMouseUp = () => {
        // Check if dropping an image onto a collage slot
        if (isDragging && selectedElementId && hoveredSlot) {
            const draggedEl = elements.find(e => e.id === selectedElementId)
            if (draggedEl && draggedEl.type === 'image') {
                const imgEl = draggedEl as ImageElement
                // Add image to the slot and remove the standalone image element
                setElements(prev => {
                    // First, update the collage slot with the image
                    const updated = prev.map(el => {
                        if (el.id === hoveredSlot.collageId && el.type === 'collage') {
                            const collage = el as CollageElement
                            return {
                                ...collage,
                                slots: collage.slots.map(slot => {
                                    if (slot.id === hoveredSlot.slotId) {
                                        return {
                                            ...slot,
                                            imageSrc: imgEl.src,
                                            imageX: 0,
                                            imageY: 0,
                                            imageWidth: 1,
                                            imageHeight: 1
                                        }
                                    }
                                    return slot
                                })
                            } as CollageElement
                        }
                        return el
                    })
                    // Remove the dragged image element
                    return updated.filter(el => el.id !== selectedElementId)
                })
                setSelectedElementId(hoveredSlot.collageId)
                setSelectedSlotId(hoveredSlot.slotId)
            }
        }
        
        setIsDragging(false)
        setIsResizing(false)
        setResizeHandle(null)
        setAlignmentGuides([])
        setHoveredSlot(null)
        setIsDraggingSlotImage(false)
        setSlotImageDragStart(null)
    }

    // Save canvas as image
    const saveImage = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Temporarily deselect to hide selection indicator
        const prevSelected = selectedElementId
        setSelectedElementId(null)

        setTimeout(() => {
            const link = document.createElement('a')
            link.download = `image-${Date.now()}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
            setSelectedElementId(prevSelected)
        }, 100)
    }

    return (
        <>
            {/* Template Choice Dialog */}
            {templateDialogOpen && pendingTemplateId && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <Card className="bg-stone-900 border-stone-700 rounded-none w-80">
                        <CardHeader className="p-4 border-b border-stone-800">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider">Template Action</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <p className="text-xs text-stone-400">
                                You have a collage selected. What would you like to do?
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full h-10 text-xs font-bold uppercase rounded-none"
                                    onClick={() => {
                                        changeCollageTemplate(pendingTemplateId)
                                        setTemplateDialogOpen(false)
                                        setPendingTemplateId(null)
                                    }}
                                >
                                    Change Selected Collage Template
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full h-10 text-xs font-bold uppercase rounded-none"
                                    onClick={() => {
                                        addCollageElement(pendingTemplateId)
                                        setTemplateDialogOpen(false)
                                        setPendingTemplateId(null)
                                    }}
                                >
                                    Add New Collage Layer
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full h-9 text-xs text-stone-500 rounded-none"
                                    onClick={() => {
                                        setTemplateDialogOpen(false)
                                        setPendingTemplateId(null)
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                {/* Canvas Area - Sticky */}
                <div className="lg:col-span-3 lg:sticky lg:top-0 lg:self-start">
                    <Card className="bg-stone-900/50 border-stone-800/60 rounded-none h-full">
                    <CardHeader className="!pl-6 !pr-10 py-5 border-b border-stone-800/40">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest">Canvas</CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-bold uppercase rounded-none"
                                    onClick={saveImage}
                                >
                                    <Download className="w-3.5 h-3.5 mr-2" /> Save
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent ref={containerRef} className="p-6 flex items-center justify-center overflow-auto relative">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            style={{
                                width: CANVAS_WIDTH * canvasScale,
                                height: CANVAS_HEIGHT * canvasScale,
                                cursor: isResizing ? getCursorForHandle(resizeHandle) : isDragging ? 'grabbing' : cursorStyle
                            }}
                            className="border border-stone-700 shadow-2xl"
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onMouseLeave={handleCanvasMouseUp}
                            onDoubleClick={handleCanvasDoubleClick}
                        />
                        {/* Text editing overlay */}
                        {isEditingText && selectedElement?.type === 'text' && (
                            <input
                                ref={textInputRef}
                                type="text"
                                value={editingTextValue}
                                onChange={(e) => setEditingTextValue(e.target.value)}
                                onBlur={finishTextEditing}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') finishTextEditing()
                                    if (e.key === 'Escape') {
                                        setIsEditingText(false)
                                        setEditingTextValue('')
                                    }
                                }}
                                style={{
                                    position: 'absolute',
                                    left: `${selectedElement.x * canvasScale + 24}px`,
                                    top: `${selectedElement.y * canvasScale + 24}px`,
                                    width: `${selectedElement.width * canvasScale}px`,
                                    fontSize: `${(selectedElement as TextElement).fontSize * canvasScale}px`,
                                    fontFamily: (selectedElement as TextElement).fontFamily,
                                    color: (selectedElement as TextElement).color,
                                    textAlign: (selectedElement as TextElement).alignment,
                                    fontWeight: (selectedElement as TextElement).bold ? 'bold' : 'normal',
                                    fontStyle: (selectedElement as TextElement).italic ? 'italic' : 'normal',
                                }}
                                className="bg-transparent border-2 border-primary outline-none px-1"
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tools Sidebar */}
            <div className="space-y-4">
                {/* Add Elements */}
                <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                    <CardHeader className="p-4 border-b border-stone-800/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-stone-500">Add Elements</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Button
                            variant="outline"
                            className="w-full h-10 justify-start text-xs font-bold uppercase rounded-none"
                            onClick={addTextElement}
                        >
                            <Type className="w-4 h-4 mr-2" /> Add Text
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-10 justify-start text-xs font-bold uppercase rounded-none"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon className="w-4 h-4 mr-2" /> Add Image
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                        <input
                            ref={slotImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleSlotImageUpload}
                        />
                    </CardContent>
                </Card>

                {/* Collage Templates */}
                <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                    <CardHeader 
                        className="p-4 border-b border-stone-800/40 cursor-pointer hover:bg-stone-800/20 transition-colors"
                        onClick={() => setIsTemplatesCollapsed(!isTemplatesCollapsed)}
                    >
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                Collage Templates ({COLLAGE_TEMPLATES.length})
                            </CardTitle>
                            {isTemplatesCollapsed ? (
                                <ChevronDown className="w-4 h-4 text-stone-500" />
                            ) : (
                                <ChevronUp className="w-4 h-4 text-stone-500" />
                            )}
                        </div>
                    </CardHeader>
                    {!isTemplatesCollapsed && (
                        <CardContent className="p-3">
                            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {COLLAGE_TEMPLATES.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleTemplateClick(template.id)}
                                        className="aspect-square bg-stone-950 border border-stone-800 hover:border-primary p-1 transition-colors"
                                        title={template.name}
                                    >
                                        <div className="w-full h-full relative">
                                            {template.slots.map((slot, idx) => (
                                                <div
                                                    key={idx}
                                                    className="absolute bg-stone-700 border border-stone-600"
                                                    style={{
                                                        left: `${slot.x * 100}%`,
                                                        top: `${slot.y * 100}%`,
                                                        width: `${slot.width * 100 - 4}%`,
                                                        height: `${slot.height * 100 - 4}%`,
                                                        margin: '2%'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* Background */}
                <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                    <CardHeader className="p-4 border-b border-stone-800/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-stone-500">Background</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="w-10 h-10 rounded-none border border-stone-700 cursor-pointer"
                            />
                            <Input
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="flex-1 h-10 text-xs rounded-none bg-stone-950 border-stone-800"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Layers - Fixed position */}
                <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                    <CardHeader className="p-4 border-b border-stone-800/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-stone-500">Layers ({elements.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {elements.length === 0 ? (
                            <p className="text-xs text-stone-600 text-center py-4">No elements added</p>
                        ) : (
                            <div className="space-y-1">
                                {[...elements].reverse().map((el, idx) => (
                                    <div key={el.id}>
                                        <div
                                            className={`flex items-center gap-2 p-2 cursor-pointer transition-colors ${
                                                el.id === selectedElementId && !selectedSlotId
                                                    ? 'bg-primary/20 border border-primary/40'
                                                    : 'bg-stone-950/50 border border-stone-800/60 hover:border-stone-700'
                                            }`}
                                            onClick={() => { setSelectedElementId(el.id); setSelectedSlotId(null); }}
                                        >
                                            {el.type === 'text' ? (
                                                <Type className="w-3.5 h-3.5 text-stone-500" />
                                            ) : el.type === 'collage' ? (
                                                <Grid className="w-3.5 h-3.5 text-stone-500" />
                                            ) : (
                                                <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                                            )}
                                            <span className="text-xs text-stone-400 truncate flex-1">
                                                {el.type === 'text' 
                                                    ? (el as TextElement).content.substring(0, 20) 
                                                    : el.type === 'collage'
                                                        ? `Collage (${(el as CollageElement).slots.length} slots)`
                                                        : `Image ${elements.length - idx}`}
                                            </span>
                                        </div>
                                        {/* Show collage slots as sub-items */}
                                        {el.type === 'collage' && el.id === selectedElementId && (
                                            <div className="ml-4 space-y-0.5 mt-0.5">
                                                {(el as CollageElement).slots.map((slot, slotIdx) => (
                                                    <div
                                                        key={slot.id}
                                                        className={`flex items-center gap-2 p-1.5 cursor-pointer transition-colors ${
                                                            slot.id === selectedSlotId
                                                                ? 'bg-cyan-500/20 border border-cyan-500/40'
                                                                : 'bg-stone-900/50 border border-stone-800/40 hover:border-stone-700'
                                                        }`}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedSlotId(slot.id); }}
                                                    >
                                                        <Square className="w-3 h-3 text-stone-600" />
                                                        <span className="text-[10px] text-stone-500 truncate flex-1">
                                                            Slot {slotIdx + 1} {slot.imageSrc ? '(has image)' : '(empty)'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Element Properties */}
                {selectedElement && (
                    <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                        <CardHeader className="p-4 border-b border-stone-800/40">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                    {selectedElement.type === 'text' ? 'Text Properties' : selectedElement.type === 'collage' ? 'Collage Properties' : 'Image Properties'}
                                </CardTitle>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveElementLayer('up')} title="Bring Forward">
                                        <ChevronUp className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveElementLayer('down')} title="Send Backward">
                                        <ChevronDown className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={duplicateSelectedElement} title="Duplicate">
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" onClick={deleteSelectedElement} title="Delete">
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {/* Opacity - Common for all elements */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Opacity</label>
                                    <span className="text-[10px] text-stone-400">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round((selectedElement.opacity ?? 1) * 100)}
                                    onChange={(e) => {
                                        const opacity = parseInt(e.target.value) / 100
                                        setElements(prev => prev.map(el =>
                                            el.id === selectedElementId ? { ...el, opacity } : el
                                        ))
                                    }}
                                    className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <Separator className="bg-stone-800/50" />

                            {selectedElement.type === 'text' && (
                                <>
                                    {/* Text Content */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Text</label>
                                        <Input
                                            value={(selectedElement as TextElement).content}
                                            onChange={(e) => updateTextElement({ content: e.target.value })}
                                            className="h-10 text-sm rounded-none bg-stone-950 border-stone-800"
                                        />
                                    </div>

                                    {/* Font */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Font</label>
                                        <select
                                            value={(selectedElement as TextElement).fontFamily}
                                            onChange={(e) => updateTextElement({ fontFamily: e.target.value })}
                                            className="w-full h-10 px-3 text-sm rounded-none bg-stone-950 border border-stone-800 text-stone-200"
                                        >
                                            {FONTS.map(font => (
                                                <option key={font} value={font}>{font}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Font Size Slider */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Size</label>
                                            <span className="text-[10px] text-stone-400">{(selectedElement as TextElement).fontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="12"
                                            max="200"
                                            value={(selectedElement as TextElement).fontSize}
                                            onChange={(e) => updateTextElement({ fontSize: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>

                                    {/* Color */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={(selectedElement as TextElement).color}
                                                onChange={(e) => updateTextElement({ color: e.target.value })}
                                                className="w-10 h-10 rounded-none border border-stone-700 cursor-pointer"
                                            />
                                            <Input
                                                value={(selectedElement as TextElement).color}
                                                onChange={(e) => updateTextElement({ color: e.target.value })}
                                                className="flex-1 h-10 text-xs rounded-none bg-stone-950 border-stone-800"
                                            />
                                        </div>
                                    </div>

                                    {/* Style Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant={(selectedElement as TextElement).bold ? "default" : "outline"}
                                            className="h-9 w-9 p-0 rounded-none"
                                            onClick={() => updateTextElement({ bold: !(selectedElement as TextElement).bold })}
                                        >
                                            <Bold className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={(selectedElement as TextElement).italic ? "default" : "outline"}
                                            className="h-9 w-9 p-0 rounded-none"
                                            onClick={() => updateTextElement({ italic: !(selectedElement as TextElement).italic })}
                                        >
                                            <Italic className="w-4 h-4" />
                                        </Button>
                                        <Separator orientation="vertical" className="h-9" />
                                        <Button
                                            size="sm"
                                            variant={(selectedElement as TextElement).alignment === 'left' ? "default" : "outline"}
                                            className="h-9 w-9 p-0 rounded-none"
                                            onClick={() => updateTextElement({ alignment: 'left' })}
                                        >
                                            <AlignLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={(selectedElement as TextElement).alignment === 'center' ? "default" : "outline"}
                                            className="h-9 w-9 p-0 rounded-none"
                                            onClick={() => updateTextElement({ alignment: 'center' })}
                                        >
                                            <AlignCenter className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={(selectedElement as TextElement).alignment === 'right' ? "default" : "outline"}
                                            className="h-9 w-9 p-0 rounded-none"
                                            onClick={() => updateTextElement({ alignment: 'right' })}
                                        >
                                            <AlignRight className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <Separator className="bg-stone-800/50" />

                                    {/* Shadow */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Shadow</label>
                                            <Button
                                                size="sm"
                                                variant={(selectedElement as TextElement).shadowEnabled ? "default" : "outline"}
                                                className="h-6 px-2 text-[9px] rounded-none"
                                                onClick={() => updateTextElement({ shadowEnabled: !(selectedElement as TextElement).shadowEnabled })}
                                            >
                                                {(selectedElement as TextElement).shadowEnabled ? 'ON' : 'OFF'}
                                            </Button>
                                        </div>
                                        {(selectedElement as TextElement).shadowEnabled && (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={(selectedElement as TextElement).shadowColor}
                                                        onChange={(e) => updateTextElement({ shadowColor: e.target.value })}
                                                        className="w-10 h-8 rounded-none border border-stone-700 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={(selectedElement as TextElement).shadowColor}
                                                        onChange={(e) => updateTextElement({ shadowColor: e.target.value })}
                                                        className="flex-1 h-8 text-xs rounded-none bg-stone-950 border-stone-800"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[9px] text-stone-500">Blur</label>
                                                        <span className="text-[9px] text-stone-400">{(selectedElement as TextElement).shadowBlur}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="50"
                                                        value={(selectedElement as TextElement).shadowBlur}
                                                        onChange={(e) => updateTextElement({ shadowBlur: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[9px] text-stone-500">Offset X</label>
                                                        <span className="text-[9px] text-stone-400">{(selectedElement as TextElement).shadowOffsetX}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="-50"
                                                        max="50"
                                                        value={(selectedElement as TextElement).shadowOffsetX}
                                                        onChange={(e) => updateTextElement({ shadowOffsetX: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[9px] text-stone-500">Offset Y</label>
                                                        <span className="text-[9px] text-stone-400">{(selectedElement as TextElement).shadowOffsetY}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="-50"
                                                        max="50"
                                                        value={(selectedElement as TextElement).shadowOffsetY}
                                                        onChange={(e) => updateTextElement({ shadowOffsetY: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Outline */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Outline</label>
                                            <Button
                                                size="sm"
                                                variant={(selectedElement as TextElement).outlineEnabled ? "default" : "outline"}
                                                className="h-6 px-2 text-[9px] rounded-none"
                                                onClick={() => updateTextElement({ outlineEnabled: !(selectedElement as TextElement).outlineEnabled })}
                                            >
                                                {(selectedElement as TextElement).outlineEnabled ? 'ON' : 'OFF'}
                                            </Button>
                                        </div>
                                        {(selectedElement as TextElement).outlineEnabled && (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={(selectedElement as TextElement).outlineColor}
                                                        onChange={(e) => updateTextElement({ outlineColor: e.target.value })}
                                                        className="w-10 h-8 rounded-none border border-stone-700 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={(selectedElement as TextElement).outlineColor}
                                                        onChange={(e) => updateTextElement({ outlineColor: e.target.value })}
                                                        className="flex-1 h-8 text-xs rounded-none bg-stone-950 border-stone-800"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[9px] text-stone-500">Width</label>
                                                        <span className="text-[9px] text-stone-400">{(selectedElement as TextElement).outlineWidth}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="20"
                                                        value={(selectedElement as TextElement).outlineWidth}
                                                        onChange={(e) => updateTextElement({ outlineWidth: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {selectedElement.type === 'image' && (
                                <>
                                    {/* Lock Aspect Ratio Toggle */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Lock Proportions</label>
                                        <Button
                                            size="sm"
                                            variant={lockAspectRatio ? "default" : "outline"}
                                            className="h-8 w-8 p-0 rounded-none"
                                            onClick={() => setLockAspectRatio(!lockAspectRatio)}
                                            title={lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                                        >
                                            {lockAspectRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </Button>
                                    </div>

                                    {/* Size Sliders */}
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Width</label>
                                                <span className="text-[10px] text-stone-400">{Math.round((selectedElement as ImageElement).width)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="50"
                                                max="1080"
                                                value={Math.round((selectedElement as ImageElement).width)}
                                                onChange={(e) => {
                                                    const newWidth = parseInt(e.target.value)
                                                    if (lockAspectRatio) {
                                                        const aspectRatio = (selectedElement as ImageElement).originalWidth / (selectedElement as ImageElement).originalHeight
                                                        updateImageElement({ width: newWidth, height: newWidth / aspectRatio })
                                                    } else {
                                                        updateImageElement({ width: newWidth })
                                                    }
                                                }}
                                                className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Height</label>
                                                <span className="text-[10px] text-stone-400">{Math.round((selectedElement as ImageElement).height)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="50"
                                                max="1080"
                                                value={Math.round((selectedElement as ImageElement).height)}
                                                onChange={(e) => {
                                                    const newHeight = parseInt(e.target.value)
                                                    if (lockAspectRatio) {
                                                        const aspectRatio = (selectedElement as ImageElement).originalWidth / (selectedElement as ImageElement).originalHeight
                                                        updateImageElement({ height: newHeight, width: newHeight * aspectRatio })
                                                    } else {
                                                        updateImageElement({ height: newHeight })
                                                    }
                                                }}
                                                className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Position Sliders */}
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">X Position</label>
                                                <span className="text-[10px] text-stone-400">{Math.round((selectedElement as ImageElement).x)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="-500"
                                                max="1080"
                                                value={Math.round((selectedElement as ImageElement).x)}
                                                onChange={(e) => updateImageElement({ x: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Y Position</label>
                                                <span className="text-[10px] text-stone-400">{Math.round((selectedElement as ImageElement).y)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="-500"
                                                max="1080"
                                                value={Math.round((selectedElement as ImageElement).y)}
                                                onChange={(e) => updateImageElement({ y: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedElement.type === 'collage' && (
                                <>
                                    {/* Slot Actions */}
                                    {selectedSlotId && (
                                        <div className="space-y-3 p-3 bg-stone-950 border border-stone-800">
                                            <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Selected Slot</label>
                                            <Button
                                                variant="outline"
                                                className="w-full h-9 text-xs font-bold uppercase rounded-none"
                                                onClick={() => slotImageInputRef.current?.click()}
                                            >
                                                <ImageIcon className="w-3.5 h-3.5 mr-2" /> Add/Replace Image
                                            </Button>
                                            {(selectedElement as CollageElement).slots.find(s => s.id === selectedSlotId)?.imageSrc && (
                                                <>
                                                    {/* Image Zoom */}
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[9px] text-stone-500">Image Zoom</label>
                                                            <span className="text-[9px] text-stone-400">
                                                                {Math.round(((selectedElement as CollageElement).slots.find(s => s.id === selectedSlotId)?.imageWidth || 1) * 100)}%
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="50"
                                                            max="200"
                                                            value={Math.round(((selectedElement as CollageElement).slots.find(s => s.id === selectedSlotId)?.imageWidth || 1) * 100)}
                                                            onChange={(e) => {
                                                                const zoom = parseInt(e.target.value) / 100
                                                                setElements(prev => prev.map(el => {
                                                                    if (el.id === selectedElementId && el.type === 'collage') {
                                                                        return {
                                                                            ...el,
                                                                            slots: (el as CollageElement).slots.map(slot =>
                                                                                slot.id === selectedSlotId
                                                                                    ? { ...slot, imageWidth: zoom, imageHeight: zoom }
                                                                                    : slot
                                                                            )
                                                                        } as CollageElement
                                                                    }
                                                                    return el
                                                                }))
                                                            }}
                                                            className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-cyan-500"
                                                        />
                                                    </div>
                                                    {/* Drag instruction */}
                                                    <p className="text-[9px] text-stone-500 italic">
                                                        Drag image in slot to pan
                                                    </p>
                                                    {/* Reset & Remove buttons */}
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 h-8 text-[10px] font-bold uppercase rounded-none"
                                                            onClick={() => {
                                                                setElements(prev => prev.map(el => {
                                                                    if (el.id === selectedElementId && el.type === 'collage') {
                                                                        return {
                                                                            ...el,
                                                                            slots: (el as CollageElement).slots.map(slot =>
                                                                                slot.id === selectedSlotId
                                                                                    ? { ...slot, imageX: 0, imageY: 0, imageWidth: 1, imageHeight: 1 }
                                                                                    : slot
                                                                            )
                                                                        } as CollageElement
                                                                    }
                                                                    return el
                                                                }))
                                                            }}
                                                        >
                                                            Reset
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 h-8 text-[10px] font-bold uppercase rounded-none hover:text-destructive"
                                                            onClick={() => {
                                                                setElements(prev => prev.map(el => {
                                                                    if (el.id === selectedElementId && el.type === 'collage') {
                                                                        return {
                                                                            ...el,
                                                                            slots: (el as CollageElement).slots.map(slot => 
                                                                                slot.id === selectedSlotId 
                                                                                    ? { ...slot, imageSrc: undefined, imageX: 0, imageY: 0, imageWidth: 1, imageHeight: 1 }
                                                                                    : slot
                                                                            )
                                                                        } as CollageElement
                                                                    }
                                                                    return el
                                                                }))
                                                            }}
                                                        >
                                                            <Trash2 className="w-3 h-3 mr-1" /> Remove
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <Separator className="bg-stone-800/50" />

                                    {/* Collage Size */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Collage Size</label>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[9px] text-stone-500">Width</label>
                                                <span className="text-[9px] text-stone-400">{Math.round((selectedElement as CollageElement).width)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="100"
                                                max="1080"
                                                value={Math.round((selectedElement as CollageElement).width)}
                                                onChange={(e) => updateCollageElement({ width: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[9px] text-stone-500">Height</label>
                                                <span className="text-[9px] text-stone-400">{Math.round((selectedElement as CollageElement).height)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="100"
                                                max="1080"
                                                value={Math.round((selectedElement as CollageElement).height)}
                                                onChange={(e) => updateCollageElement({ height: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Collage Position */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Position</label>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[9px] text-stone-500">X</label>
                                                <span className="text-[9px] text-stone-400">{Math.round((selectedElement as CollageElement).x)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="-500"
                                                max="1080"
                                                value={Math.round((selectedElement as CollageElement).x)}
                                                onChange={(e) => updateCollageElement({ x: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[9px] text-stone-500">Y</label>
                                                <span className="text-[9px] text-stone-400">{Math.round((selectedElement as CollageElement).y)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="-500"
                                                max="1080"
                                                value={Math.round((selectedElement as CollageElement).y)}
                                                onChange={(e) => updateCollageElement({ y: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        {/* Center button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-8 text-[10px] font-bold uppercase rounded-none"
                                            onClick={() => {
                                                const collage = selectedElement as CollageElement
                                                updateCollageElement({
                                                    x: (CANVAS_WIDTH - collage.width) / 2,
                                                    y: (CANVAS_HEIGHT - collage.height) / 2
                                                })
                                            }}
                                        >
                                            Center on Canvas
                                        </Button>
                                    </div>

                                    <Separator className="bg-stone-800/50" />

                                    {/* Collage Padding */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Padding</label>
                                            <span className="text-[10px] text-stone-400">{(selectedElement as CollageElement).padding}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="50"
                                            value={(selectedElement as CollageElement).padding}
                                            onChange={(e) => updateCollageElement({ padding: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>

                                    {/* Border Radius */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Border Radius</label>
                                            <span className="text-[10px] text-stone-400">{(selectedElement as CollageElement).borderRadius}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="50"
                                            value={(selectedElement as CollageElement).borderRadius}
                                            onChange={(e) => updateCollageElement({ borderRadius: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>

                                    {/* Border Width */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Border Width</label>
                                            <span className="text-[10px] text-stone-400">{(selectedElement as CollageElement).borderWidth}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            value={(selectedElement as CollageElement).borderWidth}
                                            onChange={(e) => updateCollageElement({ borderWidth: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-stone-800 rounded-none appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>

                                    {/* Background Color */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Background Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={(selectedElement as CollageElement).backgroundColor}
                                                onChange={(e) => updateCollageElement({ backgroundColor: e.target.value })}
                                                className="w-10 h-8 rounded-none border border-stone-700 cursor-pointer"
                                            />
                                            <Input
                                                value={(selectedElement as CollageElement).backgroundColor}
                                                onChange={(e) => updateCollageElement({ backgroundColor: e.target.value })}
                                                className="flex-1 h-8 text-xs rounded-none bg-stone-950 border-stone-800"
                                            />
                                        </div>
                                    </div>

                                    {/* Border Color */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Border Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={(selectedElement as CollageElement).borderColor}
                                                onChange={(e) => updateCollageElement({ borderColor: e.target.value })}
                                                className="w-10 h-8 rounded-none border border-stone-700 cursor-pointer"
                                            />
                                            <Input
                                                value={(selectedElement as CollageElement).borderColor}
                                                onChange={(e) => updateCollageElement({ borderColor: e.target.value })}
                                                className="flex-1 h-8 text-xs rounded-none bg-stone-950 border-stone-800"
                                            />
                                        </div>
                                    </div>

                                    {/* Change Template */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Change Template</label>
                                        <select
                                            value={(selectedElement as CollageElement).templateId}
                                            onChange={(e) => {
                                                const template = COLLAGE_TEMPLATES.find(t => t.id === e.target.value)
                                                if (template) {
                                                    const currentCollage = selectedElement as CollageElement
                                                    // Collect existing images from current slots
                                                    const existingImages = currentCollage.slots
                                                        .filter(slot => slot.imageSrc)
                                                        .map(slot => ({
                                                            imageSrc: slot.imageSrc,
                                                            imageX: slot.imageX,
                                                            imageY: slot.imageY,
                                                            imageWidth: slot.imageWidth,
                                                            imageHeight: slot.imageHeight
                                                        }))
                                                    
                                                    // Create new slots and preserve images in order
                                                    const newSlots: CollageSlot[] = template.slots.map((slot, index) => {
                                                        const existingImage = existingImages[index]
                                                        return {
                                                            id: `slot-${Date.now()}-${index}`,
                                                            x: slot.x,
                                                            y: slot.y,
                                                            width: slot.width,
                                                            height: slot.height,
                                                            imageSrc: existingImage?.imageSrc,
                                                            imageX: existingImage?.imageX ?? 0,
                                                            imageY: existingImage?.imageY ?? 0,
                                                            imageWidth: existingImage?.imageWidth ?? 1,
                                                            imageHeight: existingImage?.imageHeight ?? 1
                                                        }
                                                    })
                                                    updateCollageElement({ templateId: e.target.value, slots: newSlots })
                                                    setSelectedSlotId(null)
                                                }
                                            }}
                                            className="w-full h-9 px-3 text-xs rounded-none bg-stone-950 border border-stone-800 text-stone-200"
                                        >
                                            {COLLAGE_TEMPLATES.map(template => (
                                                <option key={template.id} value={template.id}>{template.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[9px] text-stone-500 italic">
                                            Images are preserved when changing templates
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
        </>
    )
}
