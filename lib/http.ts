export const USER_AGENT =
  "mica-job-board/1.0 (+https://github.com/Jjhakimoto/mica-job-board)";

const TIMEOUT_MS = 10_000;
const MAX_CONCURRENT = 3;
const MAX_BYTES = 1_500_000;

let active = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

function release(): void {
  active -= 1;
  const next = waiters.shift();
  if (next) next();
}

export type Fetched = {
  url: string;
  status: number;
  ok: boolean;
  text: string;
  contentType: string;
};

export async function fetchText(
  url: string,
  accept = "text/html,application/json,application/xml;q=0.9,*/*;q=0.8",
  maxBytes = MAX_BYTES,
): Promise<Fetched> {
  await acquire();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: accept,
      },
    });
    const bytes = await response.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, maxBytes));
    return {
      url: response.url || url,
      status: response.status,
      ok: response.ok,
      text,
      contentType: response.headers.get("content-type") ?? "",
    };
  } finally {
    clearTimeout(timer);
    release();
  }
}
