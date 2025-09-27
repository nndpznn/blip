import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "blip - profile page",
	description: "view and edit your profile.",
  };

export default function ProfilePageLayout({
	children,
  }: {
	children: React.ReactNode
  }) {
	return (
	  <section>
		{/* Include shared UI here e.g. a header or sidebar */}
		<main>{children}</main>
		
	  </section>
	)
  }