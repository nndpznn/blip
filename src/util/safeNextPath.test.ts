import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "./safeNextPath";

test("keeps same-site relative paths", () => {
	assert.equal(safeNextPath("/meet/63"), "/meet/63");
	assert.equal(safeNextPath("/create?x=1"), "/create?x=1");
});

test("falls back for missing values", () => {
	assert.equal(safeNextPath(null), "/map");
	assert.equal(safeNextPath(undefined), "/map");
	assert.equal(safeNextPath(""), "/map");
});

test("rejects absolute and protocol-relative URLs (open-redirect guard)", () => {
	assert.equal(safeNextPath("https://evil.example"), "/map");
	assert.equal(safeNextPath("//evil.example"), "/map");
	assert.equal(safeNextPath("javascript:alert(1)"), "/map");
});

test("uses a custom fallback", () => {
	assert.equal(safeNextPath("nope", "/"), "/");
});
