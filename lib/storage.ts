import { PHOTO_BUCKET } from "./constants";
import { supabase } from "./supabase";

export async function uploadPhoto(path: string, blob: Blob) {
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
}

/** 비공개 버킷이라 1시간짜리 임시 주소를 만들어 보여줌 */
export async function photoUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
