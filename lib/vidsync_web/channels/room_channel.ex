defmodule VidsyncWeb.RoomChannel do
  use VidsyncWeb, :channel
  alias Vidsync.Meetings

  @impl true
  def join("room:" <> room_id, _payload, socket) do
    Meetings.get_room(room_id)
    socket = assign(socket, :room_id, room_id)
    {:ok, socket}
  end

  @impl true
  def handle_in("video_offer", payload, socket) do
    broadcast!(socket, "video_offer", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("video_answer", payload, socket) do
    broadcast!(socket, "video_answer", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("ice_candidate", payload, socket) do
    broadcast!(socket, "ice_candidate", payload)
    {:noreply, socket}
  end
end
