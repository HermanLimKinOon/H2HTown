import Foundation
import ImageIO
import CoreGraphics
import UniformTypeIdentifiers

// Extract every GIF frame so the game controls playback without depending on
// browser GIF animation. Keep the originals in public/game as source assets.
let root = URL(fileURLWithPath: CommandLine.arguments[1])
let size = 68
var metadata: [String: Any] = [:]
for direction in ["north", "east", "south", "west"] {
    let sourceURL = root.appendingPathComponent("Idle_walk_\(direction).gif")
    guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil) else { fatalError("Cannot open \(sourceURL)") }
    let count = CGImageSourceGetCount(source)
    var frames: [CGImage] = []
    var durations: [Int] = []
    var minX = Int.max, minY = Int.max, maxX = 0, maxY = 0
    for index in 0..<count {
        let image = CGImageSourceCreateImageAtIndex(source, index, nil)!
        let width = image.width, height = image.height
        let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        let pixels = context.data!.assumingMemoryBound(to: UInt8.self)
        for y in 0..<height {
            for x in 0..<width {
                let offset = (y * width + x) * 4
                if pixels[offset + 1] > 190 && pixels[offset] < 90 && pixels[offset + 2] < 90 {
                    for channel in 0..<4 { pixels[offset + channel] = 0 }
                }
                if pixels[offset + 3] > 0 {
                    minX = min(minX, x); maxX = max(maxX, x)
                    minY = min(minY, y); maxY = max(maxY, y)
                }
            }
        }
        frames.append(context.makeImage()!)
        let properties = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [String: Any]
        let gif = properties?[kCGImagePropertyGIFDictionary as String] as? [String: Any]
        let delay = gif?[kCGImagePropertyGIFUnclampedDelayTime as String] as? Double ?? gif?[kCGImagePropertyGIFDelayTime as String] as? Double ?? 0.2
        durations.append(max(20, Int(delay * 1000)))
    }
    let sheet = CGContext(data: nil, width: size * count, height: size, bitsPerComponent: 8, bytesPerRow: size * count * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    sheet.interpolationQuality = .none
    // Normalize the visible character height, not the GIF's padded canvas.
    let crop = CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
    let targetHeight: CGFloat = 44
    let targetWidth = crop.width * targetHeight / crop.height
    for (index, frame) in frames.enumerated() {
        let character = frame.cropping(to: crop)!
        sheet.draw(character, in: CGRect(x: CGFloat(index * size) + (CGFloat(size) - targetWidth) / 2, y: 12, width: targetWidth, height: targetHeight))
    }
    let output = root.appendingPathComponent("walk-\(direction).png")
    let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, sheet.makeImage()!, nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("PNG write failed") }
    metadata[direction] = durations
    print("\(direction): \(count) frames, \(durations) ms")
}
let json = try JSONSerialization.data(withJSONObject: metadata, options: [.sortedKeys])
try json.write(to: root.appendingPathComponent("walk-timing.json"))
