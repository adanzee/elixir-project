defmodule VidsyncWeb.MeetingRoomLive do
  use VidsyncWeb, :live_view
  alias Vidsync.Meetings

@impl true
def handle_params(%{"uuid" => room_id} = params, _url, socket) do
  # Extract the optional name query parameter, falling back to a default if empty
  username = Map.get(params, "name")
  username = if username in [nil, ""], do: "Anonymous", else: username

  # Generate the dynamic sharing url pointing back to the entry gate
  base_url = VidsyncWeb.Endpoint.url()
  share_url = "#{base_url}/room/#{room_id}"

  socket =
    socket
    |> assign(room_id: room_id)
    |> assign(username: username)
    |> assign(share_url: share_url)
    |> assign(hardware_verified: false)
    |> assign(mic_enabled: true)
    |> assign(camera_enabled: true)

  {:noreply, socket}
end
  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <%= if not @hardware_verified do %>
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div class="bg-gray-800 p-8 rounded-2xl max-w-md w-full text-center space-y-6 border border-gray-700 shadow-2xl">
            <h3 class="text-xl font-bold text-white">Configure Your Media Devices</h3>
            <p class="text-sm text-gray-400">
              Welcome, <span class="text-indigo-400 font-semibold"><%= @username %></span>! Setup your devices to join.
            </p>

            <div class="flex flex-col space-y-4 max-w-xs mx-auto text-left bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
              <label class="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" id="join-with-mic" checked class="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span class="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                  Enable Microphone
                </span>
              </label>

              <label class="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" id="join-with-video" checked class="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span class="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                  Enable Camera
                </span>
              </label>
            </div>

            <button
              id="permission-btn"
              phx-hook="ResourceProvisioner"
              class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-98 shadow-lg shadow-indigo-600/20"
            >
              Join Meeting Room
            </button>
          </div>
        </div>
  <% else %>
    <div
      id="video-marketplace"
      phx-hook="WebRTCSignaling"
      phx-update="ignore"
      data-room-id={@room_id}
      data-mic-enabled={"#{@mic_enabled}"}
      data-camera-enabled={"#{@camera_enabled}"}
      class="flex flex-col items-center justify-center w-full max-w-6xl space-y-6 text-white animate-fade-in"
    >
      <div class="flex justify-between items-center w-full border-b border-gray-800 pb-4">
        <h2 class="text-xl font-extrabold tracking-tight">
          Session: <span class="text-indigo-400"><%= @room_id %></span>
        </h2>
        <span class="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">
          Encrypted P2P Link Active
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full aspect-video">
        <div class="relative rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 shadow-2xl group">
          <video id="local-video" autoplay playsinline muted class="w-full h-full object-cover transform scale-x-[-1]"></video>
          <div class="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-800">
            <%= @username %> (You)
          </div>
        </div>

        <div class="relative rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 shadow-2xl group">
          <video id="remote-video" autoplay playsinline class="w-full h-full object-cover"></video>
          <div class="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-800">
            Remote Peer
          </div>
        </div>
      </div>

      <div class="bg-gray-800/80 backdrop-blur-sm p-5 rounded-2xl shadow-xl border border-gray-700/60 w-full max-w-2xl">
        <label class="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
          Invite Others to Join
        </label>
        <div class="flex items-center gap-3">
          <input
            type="text"
            id="meeting-link-input"
            value={@share_url}
            readonly
            class="bg-gray-950 text-emerald-400 font-mono text-xs p-3.5 rounded-xl border border-gray-800 flex-1 select-all focus:outline-none"
          />
          <button
            onclick="navigator.clipboard.writeText(document.getElementById('meeting-link-input').value); alert('Meeting link copied!');"
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  <% end %>
</div>

"""
  end

  # Handle hook callbacks to progress view phase states smoothly
  @impl true
  def handle_event("hardware_checked", %{"mic" => mic, "video" => video}, socket) do
    {:noreply, socket |> assign(hardware_verified: true, mic_enabled: mic, camera_enabled: video)}
  end
end
