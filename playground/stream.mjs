// Pure SSE utilities used by Playground and Node tests.
// SSE events terminate on blank lines. Both LF and CRLF are supported,
// even when the network splits them across chunks.
export function createSseParser(onEvent) {
  let buffer = "";
  let data = [];
  let stopped = false;
  const emit = () => {
    if (data.length) {
      const message = data.join("\n");
      data = [];
      onEvent(message);
    }
  };
  const line = (value) => {
    if (!value) return emit();
    if (value.startsWith(":")) return;
    if (value === "data") return data.push("");
    if (value.startsWith("data:")) {
      let v = value.slice(5);
      if (v.startsWith(" ")) v = v.slice(1);
      data.push(v);
    }
  };
  return {
    feed(chunk) {
      if (stopped) return;
      buffer += chunk;
      let index = 0;
      while (index < buffer.length) {
        const next = buffer.slice(index).search(/[\r\n]/);
        if (next < 0) break;
        const pos = index + next;
        if (buffer[pos] === "\r" && pos === buffer.length - 1) break;
        line(buffer.slice(index, pos));
        index = pos + (buffer[pos] === "\r" && buffer[pos + 1] === "\n" ? 2 : 1);
      }
      buffer = buffer.slice(index);
    },
    flush() {
      if (stopped) return;
      if (buffer) line(buffer);
      buffer = "";
      emit();
    },
    stop() { stopped = true; buffer = ""; data = []; },
  };
}

export function parseChatDelta(data) {
  if (data === "[DONE]") return { done: true, text: "" };
  let j;
  try { j = JSON.parse(data); } catch (_) { return { done: false, text: "" }; }
  const content = j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.text ?? "";
  if (typeof content === "string") return { done: false, text: content };
  if (Array.isArray(content)) return {
    done: false,
    text: content.filter((part) => part?.type === "text").map((part) => part.text || "").join(""),
  };
  return { done: false, text: "" };
}

export async function readChatStream(response, onText) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let finished = false;
  const parser = createSseParser((data) => {
    if (finished) return;
    const part = parseChatDelta(data);
    if (part.done) { finished = true; return; }
    if (part.text) { full += part.text; onText(full); }
  });
  try {
    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    parser.feed(decoder.decode());
    parser.flush();
  } finally {
    parser.stop();
    reader.releaseLock();
  }
  return full;
}
