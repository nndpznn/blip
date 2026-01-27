import {Time} from "@internationalized/date"

// Actually accepts a string but datastructure is being weird so whatever
export const to12Hour = (time: Time) => {
  const stringTime = time.toString()
  const ampm = parseInt(stringTime.slice(0,2)) >= 12 ? 'PM' : 'AM';
  const hour = parseInt(stringTime.slice(0,2)) % 12 || 12; // Converts 0 to 12
  const min = stringTime.slice(3,5);
  
  return `${hour}:${min} ${ampm}`;
};