defmodule VidsyncWeb.RoomLive do
  use VidsyncWeb, :live_view
  alias Vidsync.Meetings

  @impl true
  def mount(%{"id" => room_id}, _session, socket) do
    case Meetings.get_room(room_id) do
      %Meetings.Room{} = room ->
        {:ok, assign(socket, room_id: room.id, page_title: "Room: #{room.id}")}
        nil ->
          {:ok, put_flash(socket, :error, "Room not found")
          |> redirect(to: "/")
      }
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="video-container">
      <h2>Vidsync Room</h2>
        <div id="video-marketplace" phx-hook="WebRTCSignaling" data-room-id={@room_id}>
          <div class="video-grid">
            <div>
              <h3>Local Feed</h3>
              <video id="local-video" autoplay muted playsinline class="w-full bg-black"></video>
            </div>
            <div>
            <h3>Remote Feed (Peer)</h3>
            <video id="remote-video" autoplay playsinline class="w-full bg-black"></video>
            </div>
          </div>
        </div>
    </div>
    """
  end

end
