import { getApiBase } from "@/lib/api-base";

/**
 * Returns URL to use for mentor profile image.
 * - Local paths (e.g. /mentors/name.jpg) are returned as-is so you can host photos in public/mentors/.
 * - LinkedIn URLs go through our API proxy so they load on live site (LinkedIn blocks direct hotlink).
 */
export function getMentorImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("/")) return imageUrl;
  if (/licdn\.com/i.test(imageUrl)) {
    return `${getApiBase()}/api/mentor-image?url=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}
