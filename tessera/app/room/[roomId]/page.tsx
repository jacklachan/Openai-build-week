import { PactRoomClient } from "@/components/pact-room-client";

export default async function PactRoomPage({ params }: PageProps<"/room/[roomId]">) {
  const { roomId } = await params;
  return <PactRoomClient roomId={roomId} />;
}
