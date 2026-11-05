/**
 * 从粘贴事件里取要上传的文件。带 text/html 时按文字处理：
 * 从 Word、Excel 复制会同时带上文字和一张渲染出来的图片，用户要的是文字。
 */
export function pasteFiles(data: DataTransfer): File[] {
  if (data.types.includes("text/html")) return [];
  return Array.from(data.files);
}

/** 截图在剪贴板里没有有意义的名字（空或 image.png），按时间命名 */
export function withScreenshotName(file: File, now: Date): File {
  if (file.name && file.name !== "image.png") return file;
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return new File([file], `截图-${stamp}.png`, { type: file.type });
}
