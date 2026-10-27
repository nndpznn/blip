import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { storagePathFromPublicUrl } from "./storagePath";

describe("storagePathFromPublicUrl", () => {
	it("extracts the object path", () => {
		assert.equal(
			storagePathFromPublicUrl("https://x.supabase.co/storage/v1/object/public/images/meetImages/u1/a.jpg", "images"),
			"meetImages/u1/a.jpg",
		);
	});

	it("drops query strings and decodes escapes", () => {
		assert.equal(
			storagePathFromPublicUrl("https://x.supabase.co/storage/v1/object/public/images/meetImages/u1/a%20b.jpg?t=1", "images"),
			"meetImages/u1/a b.jpg",
		);
	});

	it("returns null for other buckets or empty paths", () => {
		assert.equal(storagePathFromPublicUrl("https://x.supabase.co/storage/v1/object/public/avatars/a.jpg", "images"), null);
		assert.equal(storagePathFromPublicUrl("https://x.supabase.co/storage/v1/object/public/images/", "images"), null);
	});
});
