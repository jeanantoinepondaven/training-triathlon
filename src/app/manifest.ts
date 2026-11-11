import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tandem",
    short_name: "Tandem",
    description: "Our training plans, cycles and progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0e10",
    theme_color: "#0c0e10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
