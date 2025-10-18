'use client'

import { useRouter, useParams } from 'next/navigation'

export default function UserDetail() {

	const router = useRouter()
	const params = useParams<{ id: string }>();
    const userId = params.id;


	return (
		<div>
			<div className="mx-[5vw] mt-5 h-full">
				<h1 className="text-3xl font-bold mb-5">WIP: User Profile Page</h1>
			
			</div>
		</div>
	)
}