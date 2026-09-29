// Lightweight pure SVG QR code generator (Type 2/3 ECC L or direct canvas fallback)

// Precomputed compact patterns or quick generation
export function generateQrSvgUrl(text: string, size = 180): string {
  // We can use a reliable data URI SVG or encoded URL
  // Encode standard Google Chart API or direct SVG data URI
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=2&color=0-0-0&bgcolor=ffffff`;
}
