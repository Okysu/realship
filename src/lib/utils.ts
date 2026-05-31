// 轻量 className 合并工具（避免引入额外依赖）。
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// 将日期格式化为「2026-05-30 14:08」样式（本地时区）。
export function formatDateTime(date: Date | string | number) {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 将秒数格式化为「N 分 M 秒」/「M 秒」。
export function formatDuration(totalSec: number) {
  if (totalSec < 60) return `${totalSec} 秒`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min} 分 ${sec} 秒` : `${min} 分`;
}

// 将日期转为 <input type="datetime-local"> 所需的「YYYY-MM-DDTHH:mm」格式。
export function toDatetimeLocal(date: Date | string | number) {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
