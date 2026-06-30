defmodule VidsyncWeb.RoomLive do
  use VidsyncWeb, :live_view
  alias Vidsync.Meetings

  @impl true
 def mount(%{"id" => room_id}, _session, socket) do
    case Meetings.get_room(room_id) do
      {:ok, valid_room_id} ->
        {:ok, assign(socket, room_id: valid_room_id, username: "")}

      nil ->
        socket =
          socket
          |> put_flash(:error, "Could not initialize meeting room.")
          |> redirect(to: "/")

        {:ok, socket}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="lobby-container max-w-md mx-auto my-12 p-6 bg-white shadow rounded-lg">
      <h2 class="text-xl font-bold mb-4">Join Vidsync Room: <%= @room_id %></h2>

      <form phx-submit="submit_identity" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Enter Your Name</label>
          <input type="text" name="username" value={@username} required placeholder="e.g. Alice"
                 class="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"/>
        </div>
        <button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">
          Proceed to Meeting
        </button>
      </form>
    </div>
    """
  end

@impl true
def handle_event("submit_identity", %{"username" => username}, socket) do
  # Directly target the literal path string matching your router definition
  {:noreply, push_navigate(socket, to: "/meeting/#{socket.assigns.room_id}?name=#{username}")}
end


end
