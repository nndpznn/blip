import Meet from "../../../models/meet"

export default function MeetDetail() {

	const exampleMeet = new Meet("O-Block Annual Meet", "pull up, no funny shit stg", [-87.616, 41.776])

	return (
		<div>
			<p>{exampleMeet.title}</p>

		</div>
	);
}