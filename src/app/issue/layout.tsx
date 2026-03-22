import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "blip - report an issue",
	description: "report a blip issue.",
  };

export default function IssuePageLayout({
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