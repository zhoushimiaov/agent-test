import test from "node:test";
import assert from "node:assert/strict";
import { createSseParser, readChatStream, parseChatDelta } from "../stream.mjs";

test("parses CRLF events split across arbitrary chunks", () => {
  const events = [];
  const p = createSseParser((text) => events.push(text));
  const input = ': keepalive\r\ndata: {"hello":1}\r\n\r\ndata: first\r\ndata: second\r\n\r\n';
  for (const letter of input) p.feed(letter);
  p.flush();
  assert.deepEqual(events, ['{"hello":1}', 'first\nsecond']);
});

test("flushes unterminated last event and handles comments", () => {
  const events = [];
  const p = createSseParser((text) => events.push(text));
  p.feed('event: message\n: ignore\ndata: hello');
  p.flush();
  assert.deepEqual(events, ["hello"]);
});

test("supports plain LF and JSON deltas", () => {
  assert.equal(parseChatDelta('[DONE]').done, true);
  assert.equal(parseChatDelta('not json').text, '');
  assert.equal(parseChatDelta('{"choices":[{"delta":{"content":"hi"}}]}').text, 'hi');
});

test("streams text across split bytes and terminates on DONE", async () => {
  const encoder = new TextEncoder();
  const payload = [
    'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
    'data: [DONE]\n\n',
    'data: {"choices":[{"delta":{"content":"ignored"}}]}\n\n',
  ].join("");
  const bytes = encoder.encode(payload);
  let i = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (i >= bytes.length) { controller.close(); return; }
      controller.enqueue(bytes.slice(i, i + 2));
      i += 2;
    }
  });
  const updates = [];
  const output = await readChatStream({ body }, (value) => updates.push(value));
  assert.equal(output, "你好");
  assert.deepEqual(updates, ["你", "你好"]);
});

test("supports content arrays with text segments", () => {
  assert.equal(parseChatDelta(JSON.stringify({choices:[{delta:{content:[{type:'text',text:'a'},{type:'text',text:'b'}]}}]})).text, "ab");
});
