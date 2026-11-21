import api from "@/lib/api";

export interface DiaryPhoto {
  key: string;
  url: string;
}

export interface DiaryEntry {
  date: string;
  content: string;
  photos: DiaryPhoto[];
  updatedAt: string;
}

export interface DiarySummary {
  date: string;
  excerpt: string;
  photoCount: number;
}

export const MAX_PHOTOS = 9;
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export function getEntry(date: string) {
  return api.get<unknown, DiaryEntry | null>(`/diary/entries/${date}`);
}

/** 指定几天的完整日记，没写的不返回 */
export function getEntriesOn(dates: string[]) {
  if (dates.length === 0) return Promise.resolve([] as DiaryEntry[]);
  return api.get<unknown, DiaryEntry[]>("/diary/entries", { params: { dates: dates.join(",") } });
}

export function getSummaries(from: string, to: string) {
  return api.get<unknown, DiarySummary[]>("/diary/entries", { params: { from, to } });
}

export function getFirstDate() {
  return api.get<unknown, string | null>("/diary/first-date");
}

/** 整篇覆盖；清空返回 null */
export function saveEntry(date: string, content: string, photoKeys: string[]) {
  return api.put<unknown, DiaryEntry | null>(`/diary/entries/${date}`, { content, photoKeys });
}

/** 直传 R2，返回保存时要用的 key */
export async function uploadPhoto(file: File): Promise<string> {
  const { url, key, headers } = await api.get<
    unknown,
    { url: string; key: string; headers: Record<string, string> }
  >("/diary/presign", { params: { fileName: file.name, contentType: file.type } });
  const put = await fetch(url, { method: "PUT", body: file, headers });
  if (!put.ok) throw new Error(`照片上传失败（HTTP ${put.status}）`);
  return key;
}
