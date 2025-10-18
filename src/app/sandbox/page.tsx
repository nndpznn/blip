'use client'

import Meet from "@/models/meet"
import MeetCard from "@/components/meetCard"

export default function Sandbox() {
	const fakeMeetLol = new Meet("b0268d17-d76e-4585-a032-78f9518b5557","Testmeet","This is a test.","localhost:3000/sandbox",[333,333])
	fakeMeetLol.id = 35

	return (
		<div>
			<div className="mx-[5vw] mt-5 h-full">
				<h1 className="text-3xl font-bold mb-5">Sandbox</h1>

				<p className="my-5 text-xl">Put anything you need here, any component we're designing or testing! But please keep tidy and remove it when you're done.</p>
			
				<MeetCard meet={fakeMeetLol}></MeetCard>
			
			</div>
		</div>
	)
}