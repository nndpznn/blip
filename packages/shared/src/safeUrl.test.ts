import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSafeHttpUrl } from "./safeUrl";

describe("isSafeHttpUrl", () => {
	it("accepts http and https URLs", () => {
		assert.equal(isSafeHttpUrl("https://example.com/path?q=1"), true);
		assert.equal(isSafeHttpUrl("http://example.com"), true);
		assert.equal(isSafeHttpUrl("  https://example.com  "), true);
		assert.equal(isSafeHttpUrl("HTTPS://EXAMPLE.COM"), true);
	});

	it("rejects dangerous or non-web schemes", () => {
		assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
		assert.equal(isSafeHttpUrl("JaVaScRiPt:alert(1)"), false);
		assert.equal(isSafeHttpUrl("data:text/html,<script>alert(1)</script>"), false);
		assert.equal(isSafeHttpUrl("file:///etc/passwd"), false);
		assert.equal(isSafeHttpUrl("blip://auth-callback"), false);
	});

	it("rejects scheme-less, empty and malformed values", () => {
		assert.equal(isSafeHttpUrl("example.com"), false);
		assert.equal(isSafeHttpUrl("//example.com"), false);
		assert.equal(isSafeHttpUrl(""), false);
		assert.equal(isSafeHttpUrl("   "), false);
		assert.equal(isSafeHttpUrl(null), false);
		assert.equal(isSafeHttpUrl(undefined), false);
		assert.equal(isSafeHttpUrl("https://"), false);
	});

	it("rejects embedded whitespace and control characters", () => {
		assert.equal(isSafeHttpUrl("java\nscript:alert(1)"), false);
		assert.equal(isSafeHttpUrl("https://exa mple.com"), false);
		assert.equal(isSafeHttpUrl("https://example.com\u0000"), false);
	});
});
