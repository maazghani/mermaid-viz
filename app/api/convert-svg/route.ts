import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

export async function POST(request: NextRequest) {
  try {
    const { svg, width, height, isDark } = await request.json()

    if (!svg) {
      return NextResponse.json({ error: "No SVG provided" }, { status: 400 })
    }

    // Embed a web-safe font style into the SVG for proper text rendering
    let processedSvg = svg as string
    
    // Add font-family fallback to ensure text renders
    if (!processedSvg.includes("<style>")) {
      const styleTag = `<style>
        text, .nodeLabel, .edgeLabel, .label, tspan {
          font-family: Arial, Helvetica, sans-serif !important;
        }
      </style>`
      processedSvg = processedSvg.replace("<svg", `<svg>${styleTag}<svg`.slice(5))
      processedSvg = processedSvg.replace(/<svg([^>]*)>/, `<svg$1>${styleTag}`)
    }

    // Convert SVG to PNG using sharp with density for better quality
    const pngBuffer = await sharp(Buffer.from(processedSvg), { density: 150 })
      .resize(width || undefined, height || undefined, {
        fit: "inside",
        background: isDark 
          ? { r: 31, g: 31, b: 31, alpha: 1 } 
          : { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png({ quality: 100 })
      .toBuffer()

    return new NextResponse(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="mermaid-diagram.png"',
      },
    })
  } catch (error) {
    console.error("SVG conversion error:", error)
    return NextResponse.json(
      { error: "Failed to convert SVG to PNG" },
      { status: 500 }
    )
  }
}
