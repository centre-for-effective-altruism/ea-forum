import Column from "@/components/Column";
import Nav from "@/components/Nav";

export default function Home() {
  return (
    <Column className="grid grid-cols-[min-content_1fr_min-content] gap-10">
      <Nav />
      <div>
        Main
      </div>
      <div>
        RHS
      </div>
    </Column>
  );
}
