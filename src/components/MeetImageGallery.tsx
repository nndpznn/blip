"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { Skeleton } from "@heroui/react";
import { ChevronLeftIcon } from "@/assets/ChevronLeftIcon";

export type MeetImageGalleryProps = {
	images: string[];
	/** Used in alt text (e.g. meet title). */
	title?: string;
};

const THUMB_ROW_PX = 76;

function CoverPhoto({ src, alt }: { src: string; alt: string }) {
	const [loaded, setLoaded] = useState(false);
	const [failed, setFailed] = useState(false);
	const imgRef = useRef<HTMLImageElement | null>(null);

	useEffect(() => {
		setLoaded(false);
		setFailed(false);
		const el = imgRef.current;
		if (el) {
			if (el.complete && el.naturalWidth > 0) {
				setLoaded(true);
			} else if (el.complete) {
				setFailed(true);
			}
		}
	}, [src]);

	const syncFromImg = (el: HTMLImageElement | null) => {
		if (!el || !el.complete) return;
		if (el.naturalWidth > 0) {
			setLoaded(true);
			setFailed(false);
		} else {
			setFailed(true);
			setLoaded(false);
		}
	};

	return (
		<div className="absolute inset-0 overflow-hidden">
			<Skeleton
				isLoaded={loaded && !failed}
				className="h-full w-full rounded-none"
				classNames={{
					base: "h-full w-full rounded-none before:!duration-1000",
					content: "h-full w-full",
				}}
			>
				<Image
					ref={(el) => {
						imgRef.current = el;
						syncFromImg(el);
					}}
					removeWrapper
					disableSkeleton
					src={src}
					alt={alt}
					loading="eager"
					onLoad={() => {
						syncFromImg(imgRef.current);
						setLoaded(true);
					}}
					onError={() => {
						setFailed(true);
						setLoaded(false);
					}}
					className="block h-full w-full rounded-none object-cover object-center !opacity-100"
				/>
			</Skeleton>
		</div>
	);
}

function useFitSquare(hasThumbs: boolean) {
	const ref = useRef<HTMLDivElement>(null);
	const [side, setSide] = useState(0);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const measure = () => {
			const width = el.clientWidth;
			const height = el.clientHeight;
			const thumbSpace = hasThumbs ? THUMB_ROW_PX : 0;
			const viewportRoom =
				window.innerHeight - el.getBoundingClientRect().top - 16;
			const fromParent = height >= 48 ? height - thumbSpace : Number.POSITIVE_INFINITY;
			const fromViewport = viewportRoom - thumbSpace;
			setSide(
				Math.max(
					0,
					Math.floor(Math.min(width, fromParent, fromViewport)),
				),
			);
		};

		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		window.addEventListener("resize", measure);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [hasThumbs]);

	return { ref, side };
}

/**
 * Instagram-style meet gallery: square stage, thumbnail strip, first image selected by default.
 * Photos are preloaded and cropped to the stage so layout never shifts with load state or aspect ratio.
 */
export default function MeetImageGallery({
	images,
	title = "Meet",
}: MeetImageGalleryProps) {
	const [index, setIndex] = useState(0);
	const n = images.length;
	const idx = n === 0 ? 0 : Math.min(index, n - 1);
	const imageKey = images.join("\0");
	const { ref: frameRef, side } = useFitSquare(n > 1);

	useEffect(() => {
		images.forEach((url) => {
			if (!url) return;
			const img = new window.Image();
			img.decoding = "async";
			img.src = url;
		});
	}, [imageKey, images]);

	const goTo = useCallback(
		(next: number) => {
			if (n === 0) return;
			setIndex(((next % n) + n) % n);
		},
		[n],
	);
	const goPrev = () => goTo(idx - 1);
	const goNext = () => goTo(idx + 1);

	useEffect(() => {
		if (n < 2) return;
		const onKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				setIndex((cur) => (Math.min(cur, n - 1) - 1 + n) % n);
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				setIndex((cur) => (Math.min(cur, n - 1) + 1) % n);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [n]);

	const stageStyle =
		side > 0
			? { width: side, height: side }
			: { width: "min(100%, 70dvh)", aspectRatio: "1 / 1" as const };

	if (n === 0) {
		return (
			<div ref={frameRef} className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center">
				<div className="relative overflow-hidden rounded-lg bg-neutral-950" style={stageStyle}>
					<div className="absolute inset-0 flex items-center justify-center">
						<span className="text-sm text-foreground-500">No image</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div ref={frameRef} className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center gap-3">
			<div
				className="relative shrink-0 overflow-hidden rounded-lg bg-neutral-950"
				style={stageStyle}
				role="region"
				aria-roledescription="image gallery"
				aria-label={`${title} photos`}
			>
				{images.map((src, i) => (
					<div
						key={`stage-${src}-${i}`}
						className={`absolute inset-0 ${i === idx ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"}`}
						aria-hidden={i !== idx}
					>
						<CoverPhoto src={src} alt={`${title} — image ${i + 1} of ${n}`} />
					</div>
				))}

				{n > 1 && (
					<>
						<Button
							isIconOnly
							size="sm"
							variant="flat"
							className="absolute left-2 top-1/2 z-20 min-w-8 -translate-y-1/2 bg-black/55 text-white backdrop-blur-sm"
							aria-label="Previous image"
							onPress={goPrev}
						>
							<ChevronLeftIcon className="size-5" />
						</Button>
						<Button
							isIconOnly
							size="sm"
							variant="flat"
							className="absolute right-2 top-1/2 z-20 min-w-8 -translate-y-1/2 bg-black/55 text-white backdrop-blur-sm"
							aria-label="Next image"
							onPress={goNext}
						>
							<ChevronLeftIcon className="size-5 rotate-180" />
						</Button>
						<p className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs text-white/90 backdrop-blur-sm">
							{idx + 1} / {n}
						</p>
					</>
				)}
			</div>

			{n > 1 && (
				<div
					className="scrollbar-modern flex w-full max-w-full shrink-0 justify-center gap-2 overflow-x-auto px-1 py-1"
					style={{ maxWidth: side || "100%" }}
					role="tablist"
					aria-label="Photo thumbnails"
				>
					{images.map((src, i) => {
						const selected = i === idx;
						return (
							<button
								key={`thumb-${src}-${i}`}
								type="button"
								role="tab"
								aria-selected={selected}
								aria-label={`View image ${i + 1} of ${n}`}
								onClick={() => goTo(i)}
								className={`relative size-16 shrink-0 overflow-hidden rounded-md bg-neutral-950 outline-none ring-offset-2 ring-offset-background transition-[box-shadow,opacity] ${
									selected
										? "ring-2 ring-red-400 opacity-100"
										: "ring-1 ring-white/20 opacity-70 hover:opacity-100"
								}`}
							>
								<CoverPhoto src={src} alt="" />
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
