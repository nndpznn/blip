import type { Metadata } from "next"
import Nav from "@/components/nav";

export const metadata: Metadata = {
	title: "blip - all meets",
	description: "list of all meets",
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