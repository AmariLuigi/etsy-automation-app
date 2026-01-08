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
    LayoutGrid,
    ChevronUp,
    ChevronDown,
    Copy,
    Lock,
    Unlock
} from "lucide-react"

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
}

type CanvasElement = TextElement | ImageElement

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
    const collageInputRef = useRef<HTMLInputElement>(null)

    const [elements, setElements] = useState<CanvasElement[]>([])
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
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
    const textInputRef = useRef<HTMLInputElement>(null)

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

    // Calculate alignment guides for an element being dragged
    const calculateAlignmentGuides = (draggedEl: CanvasElement, newX: number, newY: number) => {
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
        
        // Compare with other elements
        elements.forEach(el => {
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
    }

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
                const el = elements.find(e => e.id === selectedElementId)
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
                    const scale = Math.max(0.2, (resizeStart.width + dx) / resizeStart.width)
                    
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
                const el = elements.find(e => e.id === selectedElementId)
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
    }, [isDragging, isResizing, selectedElementId, canvasScale, resizeStart, resizeHandle, dragOffset, lockAspectRatio, elements])

    // Render canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear and fill background
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        // Render elements in order
        elements.forEach(element => {
            if (element.type === 'image') {
                const img = new Image()
                img.src = element.src
                ctx.drawImage(img, element.x, element.y, element.width, element.height)
            } else if (element.type === 'text') {
                ctx.save()
                
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
            }

            // Selection indicator with resize handles
            if (element.id === selectedElementId) {
                ctx.save()
                ctx.strokeStyle = '#f5a623'
                ctx.lineWidth = 2
                ctx.setLineDash([5, 5])
                
                const elWidth = element.type === 'image' ? element.width : element.width
                const elHeight = element.type === 'image' ? element.height : element.height
                
                ctx.strokeRect(element.x - 2, element.y - 2, elWidth + 4, elHeight + 4)
                
                // Draw resize handles (corners) for both image and text
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
    }, [elements, selectedElementId, backgroundColor, isEditingText, alignmentGuides])

    useEffect(() => {
        renderCanvas()
    }, [renderCanvas])

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
            outlineWidth: 2
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
                        originalHeight: img.height
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

    // Create collage
    const handleCollageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const fileCount = files.length
        const newElements: ImageElement[] = []
        let loadedCount = 0

        // Calculate grid layout
        const cols = Math.ceil(Math.sqrt(fileCount))
        const rows = Math.ceil(fileCount / cols)
        const cellWidth = CANVAS_WIDTH / cols
        const cellHeight = CANVAS_HEIGHT / rows
        const padding = 10

        Array.from(files).forEach((file, index) => {
            const reader = new FileReader()
            reader.onload = (event) => {
                const img = new Image()
                img.onload = () => {
                    const row = Math.floor(index / cols)
                    const col = index % cols

                    const maxWidth = cellWidth - padding * 2
                    const maxHeight = cellHeight - padding * 2
                    const aspectRatio = img.width / img.height

                    let width = maxWidth
                    let height = width / aspectRatio

                    if (height > maxHeight) {
                        height = maxHeight
                        width = height * aspectRatio
                    }

                    const x = col * cellWidth + (cellWidth - width) / 2
                    const y = row * cellHeight + (cellHeight - height) / 2

                    newElements.push({
                        id: `collage-${Date.now()}-${index}`,
                        type: 'image',
                        src: event.target?.result as string,
                        x,
                        y,
                        width,
                        height,
                        originalWidth: img.width,
                        originalHeight: img.height
                    })

                    loadedCount++
                    if (loadedCount === fileCount) {
                        setElements(prev => [...prev, ...newElements])
                    }
                }
                img.src = event.target?.result as string
            }
            reader.readAsDataURL(file)
        })
        e.target.value = ''
    }

    // Delete selected element
    const deleteSelectedElement = () => {
        if (!selectedElementId) return
        setElements(prev => prev.filter(el => el.id !== selectedElementId))
        setSelectedElementId(null)
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

        // Check if clicking on resize handle of selected element (image or text)
        if (selectedElementId && selectedElement) {
            const handle = getResizeHandle(x, y, selectedElement as { x: number; y: number; width: number; height: number })
            if (handle) {
                setIsResizing(true)
                setResizeHandle(handle)
                setResizeStart({
                    x,
                    y,
                    width: selectedElement.type === 'image' ? selectedElement.width : (selectedElement as TextElement).width,
                    height: selectedElement.type === 'image' ? selectedElement.height : (selectedElement as TextElement).height,
                    elX: selectedElement.x,
                    elY: selectedElement.y,
                    fontSize: selectedElement.type === 'text' ? (selectedElement as TextElement).fontSize : 0
                })
                return
            }
        }

        // Find clicked element (reverse order for top element)
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i]
            let hit = false

            if (el.type === 'image') {
                hit = x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
            } else if (el.type === 'text') {
                hit = x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
            }

            if (hit) {
                setSelectedElementId(el.id)
                setIsDragging(true)
                setDragOffset({ x: x - el.x, y: y - el.y })
                return
            }
        }

        setSelectedElementId(null)
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
            const scale = Math.max(0.2, (resizeStart.width + dx) / resizeStart.width)
            
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
        if (selectedElementId && selectedElement && !isDragging && !isResizing) {
            const handle = getResizeHandle(x, y, selectedElement as { x: number; y: number; width: number; height: number })
            setCursorStyle(handle ? getCursorForHandle(handle) : 'default')
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

        setElements(prev => prev.map(el =>
            el.id === selectedElementId
                ? { ...el, x: newX, y: newY }
                : el
        ))
    }

    const handleCanvasMouseUp = () => {
        setIsDragging(false)
        setIsResizing(false)
        setResizeHandle(null)
        setAlignmentGuides([])
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Canvas Area */}
            <div className="lg:col-span-3">
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
                        <Button
                            variant="outline"
                            className="w-full h-10 justify-start text-xs font-bold uppercase rounded-none"
                            onClick={() => collageInputRef.current?.click()}
                        >
                            <LayoutGrid className="w-4 h-4 mr-2" /> Create Collage
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
                            ref={collageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleCollageUpload}
                        />
                    </CardContent>
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
                                    <div
                                        key={el.id}
                                        className={`flex items-center gap-2 p-2 cursor-pointer transition-colors ${
                                            el.id === selectedElementId
                                                ? 'bg-primary/20 border border-primary/40'
                                                : 'bg-stone-950/50 border border-stone-800/60 hover:border-stone-700'
                                        }`}
                                        onClick={() => setSelectedElementId(el.id)}
                                    >
                                        {el.type === 'text' ? (
                                            <Type className="w-3.5 h-3.5 text-stone-500" />
                                        ) : (
                                            <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                                        )}
                                        <span className="text-xs text-stone-400 truncate flex-1">
                                            {el.type === 'text' ? (el as TextElement).content.substring(0, 20) : `Image ${elements.length - idx}`}
                                        </span>
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
                                    {selectedElement.type === 'text' ? 'Text Properties' : 'Image Properties'}
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
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
