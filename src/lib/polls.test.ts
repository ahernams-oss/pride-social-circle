import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { pollStatus, validPollPeriod } from "./polls";

const s = "2026-11-20T10:00:00Z", e = "2026-11-21T18:00:00Z";
describe("período da enquete", () => {
  test("antes do início fica agendada", () => strictEqual(pollStatus(s, e, new Date("2026-11-20T09:59:00Z")), "agendada"));
  test("entre início e fim fica aberta", () => strictEqual(pollStatus(s, e, new Date("2026-11-21T12:00:00Z")), "aberta"));
  test("após o fim fica encerrada", () => strictEqual(pollStatus(s, e, new Date("2026-11-21T18:01:00Z")), "encerrada"));
  test("fim precisa ser depois do início", () => strictEqual(validPollPeriod(e, s), false));
});
