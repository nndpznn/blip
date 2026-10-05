import { test } from "node:test";
import assert from "node:assert/strict";
import {
	MEET_IMAGE_MAX_BYTES,
	MEET_IMAGE_MAX_COUNT,
	filesWithinMeetImageLimit,
	isMeetImageOverLimit,
} from "./meetImageLimits";

const fakeFile = (name: string, size = 1) => new File([new Uint8Array(size)], name);

test("isMeetImageOverLimit allows files up to exactly the max size", () => {
	assert.equal(isMeetImageOverLimit(fakeFile("a.jpg", MEET_IMAGE_MAX_BYTES)), false);
	assert.equal(isMeetImageOverLimit(fakeFile("b.jpg", MEET_IMAGE_MAX_BYTES + 1)), true);
});

test("filesWithinMeetImageLimit accepts everything when under the cap", () => {
	const files = [fakeFile("a"), fakeFile("b")];
	const { accepted, skippedNames } = filesWithinMeetImageLimit(0, files);
	assert.equal(accepted.length, 2);
	assert.deepEqual(skippedNames, []);
});

test("filesWithinMeetImageLimit only takes the remaining slots", () => {
	const files = [fakeFile("a"), fakeFile("b"), fakeFile("c")];
	const { accepted, skippedNames } = filesWithinMeetImageLimit(MEET_IMAGE_MAX_COUNT - 1, files);
	assert.deepEqual(accepted.map((f) => f.name), ["a"]);
	assert.deepEqual(skippedNames, ["b", "c"]);
});

test("filesWithinMeetImageLimit rejects all files once the cap is reached", () => {
	const files = [fakeFile("a"), fakeFile("b")];
	const { accepted, skippedNames } = filesWithinMeetImageLimit(MEET_IMAGE_MAX_COUNT, files);
	assert.equal(accepted.length, 0);
	assert.deepEqual(skippedNames, ["a", "b"]);
});
