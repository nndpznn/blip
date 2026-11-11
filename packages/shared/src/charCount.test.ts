import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { charsRemaining, counterTone } from "./charCount";

describe("charsRemaining", () => {
	it("counts characters left, negative when over", () => {
		assert.equal(charsRemaining("", 25), 25);
		assert.equal(charsRemaining("hello", 25), 20);
		assert.equal(charsRemaining("x".repeat(30), 25), -5);
	});
});

describe("counterTone", () => {
	it("is normal with plenty of room", () => {
		assert.equal(counterTone(25, 25), "normal");
		assert.equal(counterTone(4, 25), "normal");
		assert.equal(counterTone(501, 5000), "normal");
	});

	it("warns near the limit", () => {
		assert.equal(counterTone(3, 25), "warn");
		assert.equal(counterTone(0, 25), "warn");
		assert.equal(counterTone(500, 5000), "warn");
		assert.equal(counterTone(50, 500), "warn");
	});

	it("flags over the limit", () => {
		assert.equal(counterTone(-1, 25), "over");
		assert.equal(counterTone(-100, 5000), "over");
	});
});
