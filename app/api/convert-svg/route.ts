import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

export async function POST(request: NextRequest) {
  try {
    const { svg, width, height } = await request.json()

    if (!svg) {
      return NextResponse.json({ error: "No SVG provided" }, { status: 400 })
    }

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(width || undefined, height || undefined, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
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
