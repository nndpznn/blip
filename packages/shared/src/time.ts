/**
 * "13:05" or "13:05:00" (or anything whose toString() looks like that, e.g. an
 * @internationalized/date Time) -> "1:05 PM".
 */
export const to12Hour = (time: { toString(): string }): string => {
	const stringTime = time.toString();
	const hours24 = parseInt(stringTime.slice(0, 2), 10);
	const ampm = hours24 >= 12 ? "PM" : "AM";
	const hour = hours24 % 12 || 12; // Converts 0 to 12
	const min = stringTime.slice(3, 5);
	return `${hour}:${min} ${ampm}`;
};
