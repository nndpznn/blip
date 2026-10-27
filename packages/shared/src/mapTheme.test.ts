import { test } from "node:test";
import assert from "node:assert/strict";
import { DARK_THEME_OVERRIDES, PALETTE, themeMapStyle, type StyleLayerLike } from "./mapTheme";

test("recolors layers that have overrides and keeps their other paint values", () => {
	const style = {
		version: 8,
		layers: [
			{ id: "water", type: "fill", paint: { "fill-color": "#000", "fill-opacity": 0.5 } },
			{ id: "background", type: "background", paint: { "background-color": "#000" } },
		],
	};
	const out = themeMapStyle(style);
	assert.equal(out.layers[0].paint?.["fill-color"], PALETTE.water);
	assert.equal(out.layers[0].paint?.["fill-opacity"], 0.5);
	assert.equal(out.layers[1].paint?.["background-color"], PALETTE.land);
});

test("leaves layers without overrides untouched (same object)", () => {
	const unknown = { id: "some-new-layer", type: "line", paint: { "line-color": "#123" } };
	const out = themeMapStyle({ layers: [unknown] });
	assert.equal(out.layers[0], unknown);
});

test("does not mutate the input style", () => {
	const water = { id: "water", paint: { "fill-color": "#000" } };
	const style = { layers: [water] };
	themeMapStyle(style);
	assert.equal(water.paint["fill-color"], "#000");
});

test("creates a paint object for layers that had none", () => {
	const out = themeMapStyle({ layers: [{ id: "water", type: "fill" } as StyleLayerLike] });
	assert.equal(out.layers[0].paint?.["fill-color"], PALETTE.water);
});

test("returns styles with no layers unchanged", () => {
	const style = { version: 8 };
	assert.equal(themeMapStyle(style), style);
});

test("water is darker than land, as in the Mapbox dark style", () => {
	assert.ok(DARK_THEME_OVERRIDES.water["fill-color"] < DARK_THEME_OVERRIDES.background["background-color"]);
});
