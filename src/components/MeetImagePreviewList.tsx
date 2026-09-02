"use client";

import type { ReactNode } from "react";

export type MeetImagePreviewListProps = {
	/** Number of images in the list (drives empty vs scroll UI). */
	count: number;
	/** Shown when `count` is 0. */
	emptyMessage: string;
	/** Rendered above the scroll area when `count` > 0. */
	header?: ReactNode;
	children: ReactNode;
	className?: string;
};

/**
 * Scrollable image preview stack for meet create/edit.
 * Expects a flex column parent with bounded height (`flex-1 min-h-0`).
 */
export default function MeetImagePreviewList({
	count,
	emptyMessage,
	header,
	children,
	className = "",
}: MeetImagePreviewListProps) {
	const rootClass = `mt-3 flex min-h-0 min-w-0 flex-1 flex-col text-sm ${className}`.trim();

	if (count === 0) {
		return (
			<div className={rootClass}>
				<p className="text-gray-500">{emptyMessage}</p>
			</div>
		);
	}

	return (
		<div className={rootClass}>
			{header ? <div className="mb-1 shrink-0">{header}</div> : null}
			<div
				className="scrollbar-modern flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pb-1"
				role="list"
				aria-label="Meet images"
			>
				{children}
			</div>
		</div>
	);
}
