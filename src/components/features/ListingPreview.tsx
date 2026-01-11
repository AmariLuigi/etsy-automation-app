import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    X,
    ChevronLeft,
    ChevronRight,
    Play,
    Image as ImageIcon,
    Video,
    Send,
    Trash2,
    Plus,
    Maximize2,
    Minimize2
} from "lucide-react"

export interface ListingMedia {
    id: string
    type: 'image' | 'video'
    url: string
    thumbnail?: string
}

interface ListingPreviewProps {
    title: string
    description: string
    tags: string[]
    onTagsChange: (tags: string[]) => void
    images: ListingMedia[]
    video: ListingMedia | null
    onRemoveImage: (id: string) => void
    onRemoveVideo: () => void
    onPublish?: () => void
}

const MAX_IMAGES = 10
const MAX_VIDEO = 1
const MAX_TAGS = 13

export default function ListingPreview({
    title,
    description,
    tags,
    onTagsChange,
    images,
    video,
    onRemoveImage,
    onRemoveVideo,
    onPublish
}: ListingPreviewProps) {
    const [activeIndex, setActiveIndex] = useState(0)
    const [newTag, setNewTag] = useState("")
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
    const [showCropOverlay, setShowCropOverlay] = useState<'none' | 'square' | '4:3' | '5:4' | '2:1' | '1:2'>('none')

    // Combine images and video for carousel
    const allMedia: ListingMedia[] = [...images]
    if (video) {
        allMedia.splice(1, 0, video) // Insert video at position 1 like Etsy
    }

    const activeMedia = allMedia[activeIndex]

    const handlePrev = () => {
        setActiveIndex(prev => (prev === 0 ? allMedia.length - 1 : prev - 1))
    }

    const handleNext = () => {
        setActiveIndex(prev => (prev === allMedia.length - 1 ? 0 : prev + 1))
    }

    const handleThumbnailClick = (index: number) => {
        setActiveIndex(index)
    }

    const handleRemoveMedia = (media: ListingMedia) => {
        if (media.type === 'video') {
            onRemoveVideo()
        } else {
            onRemoveImage(media.id)
        }
        // Adjust active index if needed
        if (activeIndex >= allMedia.length - 1 && activeIndex > 0) {
            setActiveIndex(activeIndex - 1)
        }
    }

    return (
        <div className="space-y-6">
            {/* Media Counter */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="border-stone-700 text-stone-400 flex gap-2 h-7 px-3 rounded-sm text-[10px] font-bold uppercase">
                        <ImageIcon className="w-3 h-3" />
                        {images.length}/{MAX_IMAGES} Images
                    </Badge>
                    <Badge variant="outline" className={`border-stone-700 flex gap-2 h-7 px-3 rounded-sm text-[10px] font-bold uppercase ${video ? 'text-primary border-primary/40' : 'text-stone-400'}`}>
                        <Video className="w-3 h-3" />
                        {video ? 1 : 0}/{MAX_VIDEO} Video
                    </Badge>
                </div>
                {onPublish && (
                    <Button
                        onClick={onPublish}
                        className="h-9 font-bold uppercase tracking-wider text-[10px] rounded-none !px-6"
                        disabled={images.length === 0}
                    >
                        <Send className="w-3.5 h-3.5 mr-2" />
                        Send to Etsy
                    </Button>
                )}
            </div>

            {/* Etsy-Style Carousel - Compact Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Card className="bg-stone-900/50 border-stone-800/60 rounded-none overflow-hidden">
                    <div className="flex">
                        {/* Thumbnail Strip (Left Side) - Smaller */}
                        <div className="w-16 bg-stone-950/50 border-r border-stone-800/60 p-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                            <div className="flex flex-col gap-1.5">
                                {allMedia.map((media, index) => (
                                    <div
                                        key={media.id}
                                        className={`relative aspect-square bg-stone-900 overflow-hidden cursor-pointer transition-all group ${activeIndex === index
                                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-stone-950'
                                            : 'opacity-60 hover:opacity-100'
                                            }`}
                                        onClick={() => handleThumbnailClick(index)}
                                    >
                                        {media.type === 'video' ? (
                                            <>
                                                <img
                                                    src={media.thumbnail || media.url}
                                                    alt="Video thumbnail"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center shadow-md">
                                                        <Play className="w-2.5 h-2.5 text-stone-900 ml-0.5" fill="currentColor" />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <img
                                                src={media.url}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        {/* Remove button on hover */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveMedia(media)
                                            }}
                                            className="absolute top-0 right-0 w-3.5 h-3.5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                                        >
                                            <X className="w-2 h-2" />
                                        </button>
                                    </div>
                                ))}
                                {/* Empty slots indicator */}
                                {allMedia.length === 0 && (
                                    <div className="aspect-square bg-stone-800/50 border-2 border-dashed border-stone-700 flex items-center justify-center">
                                        <ImageIcon className="w-3 h-3 text-stone-600" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Image Display - Compact */}
                        <div className="flex-1 relative flex items-center justify-center bg-stone-950">
                            {allMedia.length > 0 && activeMedia ? (
                                <>
                                    <div className="relative w-full h-full min-h-[320px] max-h-[400px] flex items-center justify-center overflow-hidden">
                                        {activeMedia.type === 'video' ? (
                                            <video
                                                src={activeMedia.url}
                                                controls
                                                className="max-w-full max-h-full w-auto h-auto object-contain"
                                            />
                                        ) : (
                                            <img
                                                src={activeMedia.url}
                                                alt={`Listing image ${activeIndex + 1}`}
                                                className="max-w-full max-h-full w-auto h-auto object-contain"
                                            />
                                        )}

                                        {/* Navigation Arrows - Smaller */}
                                        {allMedia.length > 1 && (
                                            <>
                                                <button
                                                    onClick={handlePrev}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
                                                >
                                                    <ChevronLeft className="w-4 h-4 text-stone-900" />
                                                </button>
                                                <button
                                                    onClick={handleNext}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
                                                >
                                                    <ChevronRight className="w-4 h-4 text-stone-900" />
                                                </button>
                                            </>
                                        )}

                                        {/* Remove current media button */}
                                        <button
                                            onClick={() => handleRemoveMedia(activeMedia)}
                                            className="absolute top-2 right-2 w-6 h-6 bg-stone-950/80 hover:bg-destructive text-white rounded-full flex items-center justify-center transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>

                                        {/* Media counter */}
                                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-stone-950/80 text-[10px] font-bold text-white rounded-sm">
                                            {activeIndex + 1} / {allMedia.length}
                                        </div>

                                        {/* Video indicator */}
                                        {activeMedia.type === 'video' && (
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-[10px] font-bold uppercase text-primary-foreground rounded-sm flex items-center gap-1">
                                                <Video className="w-2.5 h-2.5" />
                                                Video
                                            </div>
                                        )}

                                        {/* Crop Overlay Toggle */}
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 bg-stone-950/80 p-1 rounded">
                                            <button
                                                onClick={() => setShowCropOverlay('none')}
                                                className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded transition-colors ${showCropOverlay === 'none' ? 'bg-primary text-primary-foreground' : 'text-stone-400 hover:text-white'}`}
                                            >
                                                Off
                                            </button>
                                            {activeMedia.type === 'image' ? (
                                                <>
                                                    <button
                                                        onClick={() => setShowCropOverlay('square')}
                                                        className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded transition-colors ${showCropOverlay === 'square' ? 'bg-primary text-primary-foreground' : 'text-stone-400 hover:text-white'}`}
                                                    >
                                                        1:1
                                                    </button>
                                                    <button
                                                        onClick={() => setShowCropOverlay('4:3')}
                                                        className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded transition-colors ${showCropOverlay === '4:3' ? 'bg-primary text-primary-foreground' : 'text-stone-400 hover:text-white'}`}
                                                    >
                                                        4:3
                                                    </button>
                                                    <button
                                                        onClick={() => setShowCropOverlay('5:4')}
                                                        className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded transition-colors ${showCropOverlay === '5:4' ? 'bg-primary text-primary-foreground' : 'text-stone-400 hover:text-white'}`}
                                                    >
                                                        5:4
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setShowCropOverlay('2:1')}
                                                        className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded transition-colors ${showCropOverlay === '2:1' ? 'bg-primary text-primary-foreground' : 'text-stone-400 hover:text-white'}`}
                                                    >
                                                        2:1
                                                    </button>
                                                    <button
                                                        onClick={() => setShowCropOverlay('1:2')}
                                                        className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded transition-colors ${showCropOverlay === '1:2' ? 'bg-primary text-primary-foreground' : 'text-stone-400 hover:text-white'}`}
                                                    >
                                                        1:2
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Crop Overlay Guides */}
                                        {showCropOverlay !== 'none' && (
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                                <div
                                                    className="border-2 border-dashed border-primary/70 bg-primary/5"
                                                    style={{
                                                        aspectRatio: showCropOverlay === 'square' ? '1/1' :
                                                            showCropOverlay === '4:3' ? '4/3' :
                                                                showCropOverlay === '5:4' ? '5/4' :
                                                                    showCropOverlay === '2:1' ? '2/1' : '1/2',
                                                        maxWidth: '90%',
                                                        maxHeight: '90%',
                                                    }}
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded">
                                                            {showCropOverlay}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-stone-800 m-3">
                                    <div className="w-12 h-12 bg-stone-900 rounded-full flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-stone-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">No Media Added</p>
                                        <p className="text-[10px] text-stone-600 mt-1">Use "Send to Listing" buttons</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Listing Details Preview - Side by side on larger screens */}
                <Card className="bg-stone-900/50 border-stone-800/60 rounded-none">
                    <CardHeader className="p-4 border-b border-stone-800/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-stone-500">Listing Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {/* Title */}
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 block">Title</label>
                            <h2 className="text-base font-bold text-stone-200 leading-tight">
                                {title || <span className="text-stone-600 italic text-sm">No title set</span>}
                            </h2>
                        </div>

                        {/* Description Preview */}
                        <div className="relative">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 block">Description</label>
                            <div className={`bg-stone-950/50 border border-stone-800/60 p-3 pr-8 overflow-y-auto custom-scrollbar transition-all ${isDescriptionExpanded ? 'max-h-[500px]' : 'max-h-32'}`}>
                                <pre className="text-[11px] text-stone-400 font-mono whitespace-pre-wrap leading-relaxed">
                                    {description || <span className="text-stone-600 italic">No description set</span>}
                                </pre>
                            </div>
                            <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="absolute bottom-2 right-2 w-5 h-5 bg-stone-800/90 hover:bg-stone-700 text-stone-400 hover:text-stone-200 rounded flex items-center justify-center transition-colors z-10"
                                title={isDescriptionExpanded ? 'Collapse' : 'Expand'}
                            >
                                {isDescriptionExpanded ? (
                                    <Minimize2 className="w-3 h-3" />
                                ) : (
                                    <Maximize2 className="w-3 h-3" />
                                )}
                            </button>
                        </div>

                        {/* Tags Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">SEO Tags</label>
                                <span className="text-[9px] text-stone-600">{tags.length}/{MAX_TAGS} used</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-colors flex gap-1.5 h-6 rounded-sm text-[9px] font-medium cursor-pointer"
                                    >
                                        {tag}
                                        <button onClick={() => onTagsChange(tags.filter(t => t !== tag))}>
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </Badge>
                                ))}
                                {tags.length === 0 && (
                                    <span className="text-[10px] text-stone-600 italic">No tags added yet</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add new tag..."
                                    className="bg-stone-950 border-stone-800 h-8 text-xs rounded-none flex-1"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && newTag.trim() && tags.length < MAX_TAGS) {
                                            onTagsChange([...tags, newTag.trim()])
                                            setNewTag("")
                                        }
                                    }}
                                />
                                <Button
                                    size="sm"
                                    className="bg-stone-800 hover:bg-stone-700 h-8 w-8 p-0 rounded-none"
                                    onClick={() => {
                                        if (newTag.trim() && tags.length < MAX_TAGS) {
                                            onTagsChange([...tags, newTag.trim()])
                                            setNewTag("")
                                        }
                                    }}
                                    disabled={tags.length >= MAX_TAGS}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-stone-900/30 border border-stone-800/40 rounded-none">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Send className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-1">How to add media</h4>
                        <ul className="text-[10px] text-stone-500 space-y-1">
                            <li>• Process images in the <strong className="text-stone-400">Images</strong> tab and click "Send to Listing"</li>
                            <li>• Generate a video in the <strong className="text-stone-400">Video</strong> tab and click "Send to Listing"</li>
                            <li>• Create graphics in the <strong className="text-stone-400">Edit</strong> tab and save to listing</li>
                            <li>• Maximum: {MAX_IMAGES} images + {MAX_VIDEO} video per listing</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
