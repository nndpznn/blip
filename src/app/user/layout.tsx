import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "blip - user detail page",
	description: "view user details.",
  };

export default function UserPageLayout({
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