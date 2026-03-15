'use client';

import React, { useEffect, useState } from 'react';
import Meet from '@/models/meet';
import { fetchUserByUID } from '@/hooks/fetchUserbyUID';

/** Raw meet row may have date, startTime/start_time, endTime/end_time as strings. */
type MeetRow = {
	date?: string | null;
	startTime?: string | null;
	start_time?: string | null;
	endTime?: string | null;
	end_time?: string | null;
};

function formatCompactTime(isoTime: string): string {
	const s = String(isoTime).replace('Z', '').trim();
	const [h, m] = s.split(':');
	const hour = parseInt(h ?? '0', 10);
	const min = parseInt(m ?? '0', 10);
	const ampm = hour >= 12 ? 'pm' : 'am';
	const h12 = hour % 12 || 12;
	return min ? `${h12}:${String(min).padStart(2, '0')}${ampm}` : `${h12}${ampm}`;
}

function formatMeetDateTime(meet: MeetRow): string {
	const dateStr = meet.date != null ? String(meet.date).split('T')[0] : null;
	if (!dateStr) return '';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return '';
	const datePart = d.toLocaleDateString('en-US', {
		month: 'numeric',
		day: 'numeric',
		year: '2-digit',
	});
	const startRaw = meet.startTime ?? meet.start_time;
	const endRaw = meet.endTime ?? meet.end_time;
	if (!startRaw && !endRaw) return datePart;
	const start = startRaw ? formatCompactTime(String(startRaw)) : null;
	const end = endRaw ? formatCompactTime(String(endRaw)) : null;
	if (start && end && start !== end) return `${datePart}, ${start}-${end}`;
	if (start) return `${datePart}, ${start}`;
	if (end) return `${datePart}, ${end}`;
	return datePart;
}

export interface MeetPopupProps {
	meets: Meet[];
	onViewMeet: (id: number) => void;
}

export default function MeetPopup({ meets, onViewMeet }: MeetPopupProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [resolvedOrganizerUsername, setResolvedOrganizerUsername] = useState<string | null>(null);
	const total = meets.length;
	const meet = meets[currentIndex];

	const organizerUsername = meet?.organizerId ? resolvedOrganizerUsername : null;

	useEffect(() => {
		if (!meet?.organizerId) return;
		let cancelled = false;
		fetchUserByUID(meet.organizerId).then((user) => {
			if (!cancelled && user && typeof user === 'object' && 'username' in user) {
				setResolvedOrganizerUsername(String((user as { username?: string }).username ?? ''));
			} else if (!cancelled) {
				setResolvedOrganizerUsername(null);
			}
		});
		return () => { cancelled = true; };
	}, [meet?.organizerId]);

	if (!meet) return null;

	const locationName = meet.location?.name ?? '';
	const dateTimeStr = formatMeetDateTime(meet as unknown as MeetRow);

	return (
		<div className="mx-3 text-black min-w-[180px] max-w-[280px]">
			<p className="text-left text-2xl font-bold break-words">{meet.title || 'Untitled Meet'}</p>
			{organizerUsername != null && organizerUsername !== '' && (
				<p className="text-left text-lg mt-0.5">by {organizerUsername}</p>
			)}
			<p className="text-left text-sm mt-0.5">{locationName || 'Unknown location'}</p>
			<p className="text-left text-xs text-black/80 mt-0.5">{dateTimeStr || 'No date set'}</p>
			<button
				type="button"
				className="mt-2 w-full bg-red-400 text-white text-[10px] px-2 py-1 rounded hover:bg-red-500 transition-colors"
				onClick={() => onViewMeet(meet.id)}
			>
				View Meet
			</button>
			{total > 1 && (
				<div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-black/20">
					<button
						type="button"
						className="text-black disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
						disabled={currentIndex === 0}
						onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
					>
						‹ Prev
					</button>
					<span className="text-xs text-black/70 font-medium">
						{currentIndex + 1} / {total}
					</span>
					<button
						type="button"
						className="text-black disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
						disabled={currentIndex === total - 1}
						onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
					>
						Next ›
					</button>
				</div>
			)}
		</div>
	);
}
