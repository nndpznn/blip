import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "blip - new meet",
	description: "create a meet!",
  };

export default function MapPageLayout({
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