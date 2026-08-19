import Link from "next/link";
import { Empty, Page } from "@/components/ui";

export default function NotFound() {
  return (
    <Page width="narrow">
      <Empty
        title="Not found"
        action={<Link href="/" className="pl-btn pl-btn-primary">Back to browse</Link>}
      >
        That page does not exist, or the listing has been taken down.
      </Empty>
    </Page>
  );
}
