import { useICloudPhotos } from "../../hooks/useICloudPhotos";

const FALLBACK_PHOTOS = [
  "https://images.pexels.com/photos/1591382/pexels-photo-1591382.jpeg?auto=compress&cs=tinysrgb&w=1920",
  "https://images.pexels.com/photos/1266810/pexels-photo-1266810.jpeg?auto=compress&cs=tinysrgb&w=1920",
  "https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=1920",
  "https://images.pexels.com/photos/1509534/pexels-photo-1509534.jpeg?auto=compress&cs=tinysrgb&w=1920",
  "https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1920",
];

export function PhotoSlideshow() {
  const { currentPhoto, loading } = useICloudPhotos();

  const bgUrl = currentPhoto?.url || FALLBACK_PHOTOS[0];

  if (loading) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="absolute inset-0 animate-pulse bg-white/5" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        key={bgUrl}
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-2000"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
    </div>
  );
}
