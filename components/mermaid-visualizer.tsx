"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import mermaid from "mermaid"
import { Download, Sun, Moon, Palette, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type MermaidTheme = "default" | "neutral" | "dark" | "forest" | "base"

interface ThemeOption {
  name: string
  value: MermaidTheme
  description: string
}

const themes: ThemeOption[] = [
  { name: "Default", value: "default", description: "Clean blue tones" },
  { name: "Neutral", value: "neutral", description: "Grayscale palette" },
  { name: "Dark", value: "dark", description: "Dark background" },
  { name: "Forest", value: "forest", description: "Green tones" },
  { name: "Base", value: "base", description: "Minimal styling" },
]

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3]
const DEFAULT_ZOOM = 1

const defaultCode = `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]`

export function MermaidVisualizer() {
  const [code, setCode] = useState(defaultCode)
  const [mermaidTheme, setMermaidTheme] = useState<MermaidTheme>("default")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [svg, setSvg] = useState<string>("")
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const previewRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)

  // Zoom controls
  const zoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom)
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1])
    } else if (currentIndex === -1) {
      const nextLevel = ZOOM_LEVELS.find(l => l > zoom)
      if (nextLevel) setZoom(nextLevel)
    }
  }

  const zoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom)
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1])
    } else if (currentIndex === -1) {
      const prevLevel = [...ZOOM_LEVELS].reverse().find(l => l < zoom)
      if (prevLevel) setZoom(prevLevel)
    }
  }

  const resetZoom = () => setZoom(DEFAULT_ZOOM)

  // Initialize dark mode from system preference
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDarkMode(prefersDark)
    if (prefersDark) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  // Render mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!code.trim()) {
      setSvg("")
      setError(null)
      return
    }

    renderIdRef.current += 1
    const currentRenderId = renderIdRef.current

    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: "loose",
      fontFamily: "Inter, system-ui, sans-serif",
    })

    try {
      const { svg: renderedSvg } = await mermaid.render(
        `mermaid-${currentRenderId}`,
        code
      )
      if (currentRenderId === renderIdRef.current) {
        setSvg(renderedSvg)
        setError(null)
      }
    } catch (err) {
      if (currentRenderId === renderIdRef.current) {
        setError(err instanceof Error ? err.message : "Invalid diagram syntax")
        setSvg("")
      }
    }
  }, [code, mermaidTheme])

  // Debounced render
  useEffect(() => {
    const timeout = setTimeout(renderDiagram, 300)
    return () => clearTimeout(timeout)
  }, [renderDiagram])

  // Download as PNG via server-side conversion
  const downloadPng = async () => {
    if (!svg || !previewRef.current) return

    const svgElement = previewRef.current.querySelector("svg")
    if (!svgElement) return

    try {
      // Clone and prepare SVG with explicit dimensions
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement
      const bbox = svgElement.getBBox()
      const padding = 40
      const width = Math.ceil(bbox.width) + padding * 2
      const height = Math.ceil(bbox.height) + padding * 2
      
      svgClone.setAttribute("width", String(width))
      svgClone.setAttribute("height", String(height))
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
      
      // Add background rect
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      bgRect.setAttribute("width", "100%")
      bgRect.setAttribute("height", "100%")
      bgRect.setAttribute("fill", isDarkMode ? "#1f1f1f" : "#ffffff")
      svgClone.insertBefore(bgRect, svgClone.firstChild)

      const svgData = new XMLSerializer().serializeToString(svgClone)

      // Send to API for conversion
      const response = await fetch("/api/convert-svg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ svg: svgData, width: width * 2, height: height * 2 }),
      })

      if (!response.ok) throw new Error("Conversion failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "mermaid-diagram.png"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download error:", err)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-foreground"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
            <path d="M7 10v4M17 10v7a1 1 0 01-1 1h-3" />
          </svg>
          <span className="font-mono text-sm font-medium tracking-tight">
            Mermaid Visualizer
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">{themes.find(t => t.value === mermaidTheme)?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {themes.map((theme) => (
                <DropdownMenuItem
                  key={theme.value}
                  onClick={() => setMermaidTheme(theme.value)}
                  className={mermaidTheme === theme.value ? "bg-accent" : ""}
                >
                  <div className="flex flex-col">
                    <span>{theme.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {theme.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dark Mode Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Download Button */}
          <Button
            variant="default"
            size="sm"
            onClick={downloadPng}
            disabled={!svg}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PNG</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Code Editor Panel */}
        <div className="flex h-1/2 flex-col border-b border-border md:h-full md:w-1/2 md:border-b-0 md:border-r">
          <div className="flex h-10 shrink-0 items-center border-b border-border bg-muted/30 px-4">
            <span className="text-xs font-medium text-muted-foreground">
              EDITOR
            </span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your Mermaid code here..."
            spellCheck={false}
            className="code-editor flex-1 resize-none bg-card p-4 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Preview Panel */}
        <div className="flex h-1/2 flex-col md:h-full md:w-1/2">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4">
            <span className="text-xs font-medium text-muted-foreground">
              PREVIEW
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={zoomOut}
                disabled={zoom <= ZOOM_LEVELS[0]}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <button
                onClick={resetZoom}
                className="min-w-[3.5rem] rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={zoomIn}
                disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={resetZoom}
                title="Reset zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-card p-4">
            {error ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-destructive">
                    Syntax Error
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {error}
                  </span>
                </div>
              </div>
            ) : svg ? (
              <div
                ref={previewRef}
                className="mermaid-preview flex min-h-full min-w-full items-center justify-center"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Enter Mermaid code to see the diagram
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
