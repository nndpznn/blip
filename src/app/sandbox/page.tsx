'use client'

import { Button } from "@heroui/button"

export default function Sandbox() {
	// const fakeMeetLol = new Meet("b0268d17-d76e-4585-a032-78f9518b5557","Testmeet","This is a test.","localhost:3000/sandbox",{
	// 		address: "Chicago Default Location",
	// 		coordinates: [-87.616, 41.776] // Default coordinates
	// 	})
	// fakeMeetLol.id = 35

	return (
		<div>
			<div className="mx-[5vw] mt-5 h-full">
				<h1 className="text-3xl font-bold mb-5">Sandbox</h1>

				<p className="my-5 text-xl">Put anything you need here, any component we&apos;re designing or testing! But please keep tidy and remove it when you&apos;re done.</p>
			
				{/* <MeetCard meet={fakeMeetLol}></MeetCard> */}
			
			</div>

			<div className="mx-[5vw] mt-5">
				<h1 className="text-xl font-bold mb-5">Testing button style</h1>

				<Button className="mx-2 bg-black backdrop-blur-sm border border-gray-600 hover:bg-gray-700 rounded-2xl">see meets</Button>
				<Button className="mx-2 bg-white/10 backdrop-blur-sm border border-white/20 shadow-sm hover:shadow-[0_0_5px_rgba(255,255,255,0.8)] rounded-2xl">see meets</Button>
			</div>
		</div>
	)
}