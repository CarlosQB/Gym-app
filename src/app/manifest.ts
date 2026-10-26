import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gym",
    short_name: "Gym",
    description: "Mi progreso en el gym",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0e10",
    theme_color: "#0d0e10",
    lang: "es",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
