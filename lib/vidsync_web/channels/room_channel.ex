defmodule VidsyncWeb.RoomChannel do
  use VidsyncWeb, :channel
  alias Vidsync.Meetings

  @impl true
  def join("room:" <> room_id, _payload, socket) do
    Meetings.get_room(room_id)
    socket = assign(socket, :room_id, room_id)
    IO.puts(" A browser just connected to signaling topic: room:#{room_id}")
    {:ok, socket}
  end

  def handle_in("peer_joined", payload, socket) do
    IO.inspect(payload, label: "📣 PEER JOINED SIGNAL RECEIVED")
    broadcast_from!(socket, "peer_joined", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("video_offer", payload, socket) do
    IO.puts(" Forwarding WebRTC Offer to remote peer...")
    broadcast_from!(socket, "video_offer", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("video_answer", payload, socket) do
    IO.puts(" Returning WebRTC Answer to caller...")
    broadcast_from!(socket, "video_answer", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("ice_candidate", payload, socket) do
    broadcast_from!(socket, "ice_candidate", payload)
    {:noreply, socket}
  end
end
