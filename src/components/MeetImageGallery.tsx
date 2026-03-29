"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";

export type MeetImageGalleryProps = {
	images: string[];
	/** Used in alt text (e.g. meet title). */
	title?: string;
};

/**
 * Manual image carousel: prev/next wrap; no auto-advance. First image is the list thumbnail elsewhere.
 */
export default function MeetImageGallery({
	images,
	title = "Meet",
}: MeetImageGalleryProps) {
	const [index, setIndex] = useState(0);
	const n = images.length;
	/** Clamped so if `images` shrinks, we still show a valid slide without an effect. */
	const idx = n === 0 ? 0 : Math.min(index, n - 1);

	if (n === 0) {
		return (
			<span className="text-foreground-500 text-sm">No image</span>
		);
	}

	const src = images[idx];
	const alt = `${title} — image ${idx + 1} of ${n}`;
	const showNav = n > 1;

	const goPrev = () =>
		setIndex((cur) => {
			const i = Math.min(cur, n - 1);
			return (i - 1 + n) % n;
		});
	const goNext = () =>
		setIndex((cur) => {
			const i = Math.min(cur, n - 1);
			return (i + 1) % n;
		});

	return (
		<div className="flex w-full max-w-full flex-col items-center gap-3">
			<div
				className={
					showNav
						? "flex w-full max-w-full items-center justify-center gap-1 sm:gap-2"
						: "flex w-full max-w-full items-center justify-center"
				}
			>
				{showNav && (
					<Button
						isIconOnly
						variant="flat"
						size="sm"
						className="shrink-0 text-white"
						aria-label="Previous image"
						onPress={goPrev}
					>
						<span className="text-2xl leading-none" aria-hidden>
							‹
						</span>
					</Button>
				)}
				<div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
					<Image
						key={src}
						removeWrapper
						disableSkeleton
						src={src}
						alt={alt}
						className="max-h-[60vh] w-full max-w-full rounded-none object-contain object-center"
					/>
				</div>
				{showNav && (
					<Button
						isIconOnly
						variant="flat"
						size="sm"
						className="shrink-0 text-white"
						aria-label="Next image"
						onPress={goNext}
					>
						<span className="text-2xl leading-none" aria-hidden>
							›
						</span>
					</Button>
				)}
			</div>
			{showNav && (
				<p className="text-xs text-foreground/70" aria-live="polite">
					{idx + 1} / {n}
				</p>
			)}
		</div>
	);
}
