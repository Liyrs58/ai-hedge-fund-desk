import { DeskApp } from "@/components/desk/desk-app";
import { getSession } from "@/lib/desk";

export default function Home() {
  return <DeskApp session={getSession()} />;
}
